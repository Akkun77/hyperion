"""Explicit controlled requests dispatched through this app's real middleware."""
import asyncio
import uuid
from typing import Literal
import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func
from database import db_client
from database.models import TrafficLogDB, SecurityAlertDB
from product_traffic import traffic_record
from product_connections import require_local_control

class ScenarioInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    scenario: Literal['normal','scraping','token','bola','shadow']
    authorized: bool = False

def install_demo(app,execution_flow):
    router=APIRouter(prefix='/api/governance/demo',tags=['Controlled demonstration'])
    lock=asyncio.Lock()
    @router.post('/run')
    async def run(payload:ScenarioInput,request:Request):
        require_local_control(request)
        if not payload.authorized:
            raise HTTPException(403,'Confirm authorization to append controlled local demonstration requests.')
        if request.client and request.client.host not in ('127.0.0.1','::1','testclient'):
            raise HTTPException(403,'Controlled demonstration is available only from the local host.')
        if lock.locked():
            raise HTTPException(409,'Another controlled demonstration is running. Wait for its result.')
        async with lock:
            run_id=uuid.uuid4().hex
            # A fresh reserved benchmark IP and credential isolate detector windows;
            # these are labeled synthetic observations, never remote-target requests.
            prefix=f'198.18.{int(run_id[:2],16)}'
            ip=f'{prefix}.{int(run_id[2:4],16)}'
            ips=[ip] if payload.scenario!='token' else [f'{prefix}.{value}' for value in (1,2,3)]
            count=16 if payload.scenario=='scraping' else 3 if payload.scenario=='token' else 1
            path='/api/v2/debug' if payload.scenario=='shadow' else '/api/v1/users/user_202' if payload.scenario=='bola' else '/api/v1/users/user_101'
            with db_client.SessionLocal() as db:
                before=db.query(func.max(TrafficLogDB.id)).scalar() or 0
            statuses=[]
            # ASGITransport cannot resolve DNS or send to a URL supplied by a user.
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url='http://hyperion-controlled.invalid') as client:
                for index in range(count):
                    response=await client.get(path,headers={'Authorization':f'Bearer controlled-demo-{run_id}','X-User-Id':'user_101','X-Forwarded-For':ips[index%len(ips)]})
                    statuses.append(response.status_code)
            with db_client.SessionLocal() as db:
                events=db.query(TrafficLogDB).filter(TrafficLogDB.id>before,TrafficLogDB.caller_ip.in_(ips)).order_by(TrafficLogDB.id).all()
                ids=[event.id for event in events]
                alerts=db.query(SecurityAlertDB).filter(SecurityAlertDB.related_event_id.in_(ids)).order_by(SecurityAlertDB.id).all()
                chosen=alerts[-1].related_event_id if alerts else ids[-1] if ids else None
                selected=next((event for event in events if event.id==chosen),None)
                findings=[dict(alert_id=str(alert.id),alert_type=alert.alert_type.lower(),severity=alert.severity,description=alert.details,related_event_id=alert.related_event_id) for alert in alerts]
                request_record=traffic_record(selected) if selected else None
            if not chosen or len(ids)!=count:
                raise HTTPException(500,'Controlled requests returned, but persistence could not be verified. Inspect backend logs before retrying.')
            flow=await execution_flow(event_id=chosen)
            return dict(run_id=run_id,scenario=payload.scenario,source='controlled_local_demo',execution='completed',
                        presentation='Recorded stage walkthrough of this completed backend execution; not per-stage streaming.',
                        request_count=len(ids),event_ids=ids,response_statuses=statuses,selected_request=request_record,findings=findings,
                        detector_result='Finding generated' if findings else 'No security alert created by these requests',flow=flow)
    app.include_router(router)
