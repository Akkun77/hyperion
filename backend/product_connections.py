"""Explicit, bounded catalog registration. Never fetch user-supplied URLs/refs."""
import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Literal
from urllib.parse import urlsplit
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from database import db_client
from database.models import APIConnectionDB, APIEndpointDB

METHODS = {'GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS','TRACE'}

def require_local_control(request: Request):
    """Local setup surface, not an unauthenticated remote management service."""
    if request.client and request.client.host not in ('127.0.0.1','::1','testclient'):
        raise HTTPException(403,'API setup and controlled execution are local-host workflows.')
    origin=request.headers.get('origin')
    if origin:
        try:
            trusted=urlsplit(origin).hostname in ('127.0.0.1','localhost','::1')
        except ValueError:
            trusted=False
        if not trusted:
            raise HTTPException(403,'Cross-site setup requests are not permitted. Open the local Hyperion frontend.')
class EndpointInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    method: str = Field(max_length=10)
    path: str = Field(max_length=400)

class ConnectionInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    kind: Literal['manual','openapi','demo']
    name: str = Field(default='Authorized API',min_length=1,max_length=100)
    base_url: str = Field(default='',max_length=500)
    routes: list[EndpointInput] = Field(default_factory=list,max_length=200)
    specification: dict | None = None
    authorized: bool = False

def valid_url(value):
    try:
        url = urlsplit(value)
        if url.scheme not in ('http','https') or not url.hostname or url.username or url.password or url.query or url.fragment or re.search(r'[\s\\\x00-\x1f]',value):
            raise ValueError()
        if url.port is not None and not 1 <= url.port <= 65535:
            raise ValueError()
    except ValueError:
        raise HTTPException(422,'Use an http(s) base URL without credentials, query parameters or a fragment. No URL will be fetched.')
    return value.rstrip('/'), url.path.rstrip('/')

def prepare(payload):
    if payload.kind == 'demo':
        return dict(name='Hyperion controlled local API',kind='demo',base_url='local://hyperion',routes=[dict(method='GET',path='/api/v1/users/{id}'),dict(method='GET',path='/api/v1/users/{id}/balance'),dict(method='POST',path='/api/v1/payments')])
    routes = [row.model_dump() for row in payload.routes]
    base = payload.base_url
    if payload.kind == 'openapi':
        spec = payload.specification
        if not isinstance(spec,dict) or len(json.dumps(spec).encode())>1_000_000:
            raise HTTPException(422,'Supply an OpenAPI JSON document under 1 MB.')
        info=spec.get('info')
        if not (re.fullmatch(r'3\.\d+\.\d+(?:[-+].*)?',str(spec.get('openapi',''))) or spec.get('swagger')=='2.0') or not isinstance(info,dict) or not all(isinstance(info.get(key),str) and info[key].strip() for key in ('title','version')) or not isinstance(spec.get('paths'),dict):
            raise HTTPException(422,'Expected OpenAPI 3.x or Swagger 2.0 with info and paths objects.')
        if not base:
            servers=spec.get('servers')
            if isinstance(servers,list) and servers and isinstance(servers[0],dict):
                base=servers[0].get('url','')
            elif spec.get('host'):
                base='https://'+str(spec['host'])+str(spec.get('basePath',''))
        routes=[]
        for path,operations in spec['paths'].items():
            if not isinstance(operations,dict):
                raise HTTPException(422,'Each path must contain an operations object.')
            for method,operation in operations.items():
                if method.upper() in METHODS:
                    if not isinstance(operation,dict) or not isinstance(operation.get('responses'),dict):
                        raise HTTPException(422,'Each imported operation needs a responses object.')
                    routes.append(dict(method=method.upper(),path=path))
    base,prefix=valid_url(base)
    if not routes or len(routes)>200:
        raise HTTPException(422,'Register 1–200 documented operations at a time.')
    normalized={}
    for route in routes:
        method=route['method'].upper();path=route['path']
        if method not in METHODS or not isinstance(path,str) or not path.startswith('/') or path.startswith('//') or re.search(r'[\s?#\\\x00-\x1f]',path) or '..' in path.split('/') or len(path)>400:
            raise HTTPException(422,'Each operation needs a supported HTTP method and absolute route path without query parameters.')
        if prefix and not (path==prefix or path.startswith(prefix+'/')):
            path=prefix+path
        path=re.sub(r'\{[^/{}]+\}','{id}',path).rstrip('/') or '/'
        if path.startswith('/api/governance') or path in ('/api/health','/api/traffic','/api/alerts','/api/risk-scores','/api/risk-hierarchy','/api/execution-flow'):
            raise HTTPException(422,'Operational control-plane routes cannot be registered as business APIs.')
        normalized[method+':'+path]=dict(method=method,path=path)
    return dict(name=payload.name.strip() or 'Authorized API',kind=payload.kind,base_url=base,routes=sorted(normalized.values(),key=lambda row:(row['path'],row['method'])))

def registered_routes():
    with db_client.SessionLocal() as db:
        return {f"{route['method']}:{route['path']}" for connection in db.query(APIConnectionDB) for route in json.loads(connection.routes)}

def connection_status(row,db):
    routes=json.loads(row.routes)
    # External URL registration is metadata, not proof that traffic belongs to that origin.
    observed=[]
    if row.kind=='demo':
        for route in routes:
            item=db.query(APIEndpointDB).filter_by(method=route['method'],endpoint=route['path']).first()
            if item and item.total_calls:
                observed.append(item)
    return dict(id=row.id,name=row.name,kind=row.kind,base_url=row.base_url,routes=routes,created_at=row.created_at,
                last_observed_at=max((item.last_seen for item in observed if item.last_seen),default=None),
                status='local_traffic_observed' if observed else 'registered_only',observed_requests=sum(item.total_calls or 0 for item in observed),
                capture_method='In-process FastAPI middleware' if row.kind=='demo' else 'Not configured for this remote origin',
                message='Local demo requests have been observed; this is not a remote uptime check.' if observed else 'Documented inventory registered. No active external monitoring or remote reachability is claimed.')

def install_connections(app,documented_routes,evaluate):
    router=APIRouter(prefix='/api/governance/connections',tags=['Connect API'])
    @router.post('/validate')
    def validate(payload:ConnectionInput,request:Request):
        require_local_control(request)
        result=prepare(payload)
        return {**result,'valid':True,'capture_options':['Built-in demo: real requests captured by this FastAPI middleware.','Your FastAPI API: integrate equivalent middleware into the application handling your authorized requests.','Remote URL: catalog registration only. No remote proxy, polling, packet capture or log collector is configured.'],
                'limitations':'JSON route-level validation only; schemas and external $ref URLs are not fetched or resolved. No credentials are stored.'}
    @router.post('')
    def register(payload:ConnectionInput,request:Request):
        require_local_control(request)
        if not payload.authorized:
            raise HTTPException(403,'Confirm that you own or are authorized to register and test this API.')
        result=prepare(payload)
        fingerprint=hashlib.sha256(json.dumps(result,sort_keys=True).encode()).hexdigest()
        with db_client.SessionLocal() as db:
            row=db.query(APIConnectionDB).filter_by(fingerprint=fingerprint).first()
            if not row:
                row=APIConnectionDB(fingerprint=fingerprint,name=result['name'],kind=result['kind'],base_url=result['base_url'],routes=json.dumps(result['routes']),created_at=datetime.now(timezone.utc).isoformat())
                db.add(row)
                alerts=[dict(endpoint=a.endpoint,alert_type=a.alert_type,severity=a.severity) for a in db_client.get_alerts(limit=None)]
                for route in result['routes']:
                    endpoint=db.query(APIEndpointDB).filter_by(method=route['method'],endpoint=route['path']).first()
                    if endpoint:
                        endpoint.is_shadow=False
                        if endpoint.total_calls:
                            score,severity,reasons=evaluate(method=endpoint.method,endpoint=endpoint.endpoint,auth_type=endpoint.auth_type,is_shadow=False,contains_pii=endpoint.contains_pii,alerts=alerts)
                            endpoint.risk_score=score;endpoint.severity=severity;endpoint.risk_reasons=json.dumps(reasons)
                    else:
                        db.add(APIEndpointDB(method=route['method'],endpoint=route['path'],is_shadow=False,risk_score=0,severity='NOT_OBSERVED',risk_reasons=json.dumps(['Registered only; no traffic observed and exposure has not been evaluated.']),auth_type='Not observed',contains_pii=False,total_calls=0,last_seen=None))
                db.commit();db.refresh(row)
            documented_routes.update(f"{route['method']}:{route['path']}" for route in result['routes'])
            return connection_status(row,db)
    @router.get('')
    def connections():
        with db_client.SessionLocal() as db:
            return [connection_status(row,db) for row in db.query(APIConnectionDB).order_by(APIConnectionDB.id.desc()).limit(100)]
    app.include_router(router)
