"""Read-only SQL aggregation and bounded historical request pagination."""
import math
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import Integer, String, cast, func, or_
from database import db_client
from database.models import TrafficLogDB as Traffic, SecurityAlertDB as Alert

router = APIRouter(prefix='/api/governance', tags=['Activity'])

@router.get('/findings/{alert_id}')
def finding_by_id(alert_id: int):
    with db_client.SessionLocal() as db:
        alert=db.query(Alert).filter_by(id=alert_id).first()
        if alert is None:
            raise HTTPException(404,'Finding not found')
        return dict(alert_id=str(alert.id),alert_type=alert.alert_type.lower(),severity=alert.severity.lower(),description=alert.details,
                    detection_method='runtime_security_analysis',timestamp=alert.timestamp,related_event_ids=[alert.related_event_id] if alert.related_event_id else [],
                    recommended_action='Review the related traffic event and access controls.')

def traffic_record(row):
    return dict(id=row.id, timestamp=row.timestamp, method=row.method, endpoint=row.endpoint,
                caller_ip=row.caller_ip, user_id=row.token_user_id, target_resource_id=row.target_resource_id,
                token=None, auth_type=row.auth_type, payload_size_bytes=row.payload_size_bytes,
                status_code=row.status_code)

def filtered(db, period, search, method, status, start, end):
    query = db.query(Traffic)
    stamp = cast(func.strftime('%s', Traffic.timestamp), Integer)
    now = datetime.now(timezone.utc).timestamp()
    if period != 'all':
        query = query.filter(stamp >= now - int(period) * 60, stamp <= now)
    for value, is_start in [(start, True), (end, False)]:
        if value:
            try:
                parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
                if parsed.tzinfo is None:
                    raise ValueError('Timezone required')
                epoch = parsed.timestamp()
            except ValueError:
                raise HTTPException(422, 'Use an ISO timestamp with a timezone.')
            query = query.filter(stamp >= epoch if is_start else stamp <= epoch)
    if start and end and datetime.fromisoformat(start.replace('Z', '+00:00')) > datetime.fromisoformat(end.replace('Z', '+00:00')):
        raise HTTPException(422, 'Start must not be after end.')
    if search.strip():
        term = search.strip()
        query = query.filter(or_(Traffic.endpoint.contains(term, autoescape=True), Traffic.caller_ip.contains(term, autoescape=True),
                                 Traffic.token_user_id.contains(term, autoescape=True), cast(Traffic.id, String).contains(term, autoescape=True)))
    if method != 'all':
        query = query.filter(Traffic.method == method)
    if status != 'all':
        query = query.filter(Traffic.status_code >= int(status)*100, Traffic.status_code < (int(status)+1)*100)
    return query

@router.get('/traffic-summary')
def activity_summary(period: str = Query('60', pattern='^(all|15|60|1440)$'), search: str = Query('', max_length=256),
                     method: str = Query('all', pattern='^(all|GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$'),
                     status: str = Query('all', pattern='^(all|[1-5])$'), group: str = Query('endpoint', pattern='^(endpoint|caller|status|interval)$'),
                     interval: int = Query(5, ge=1, le=1440), start: str | None = None, end: str | None = None):
    with db_client.SessionLocal() as db:
        query = filtered(db, period, search, method, status, start, end)
        total = query.count()
        unique = query.with_entities(Traffic.method, Traffic.endpoint).distinct().count()
        stamp = cast(func.strftime('%s', Traffic.timestamp), Integer)
        first, last = query.with_entities(func.min(stamp), func.max(stamp)).one()
        seconds = max(interval*60, math.ceil(((last or 0)-(first or 0)+1)/120))
        bucket = cast(stamp / seconds, Integer) * seconds
        series = query.with_entities(bucket.label('bucket'), func.count(Traffic.id)).filter(stamp.is_not(None)).group_by(bucket).order_by(bucket).all()
        dimension = {'endpoint': Traffic.method + ' ' + Traffic.endpoint, 'caller': func.coalesce(Traffic.caller_ip, 'Unknown'),
                     'status': cast(Traffic.status_code, String), 'interval': cast(bucket, String)}[group]
        grouped = query.with_entities(dimension.label('label'), func.count(Traffic.id).label('count')).group_by(dimension).order_by(func.count(Traffic.id).desc(), dimension).limit(10).all()
        responses = query.with_entities(Traffic.status_code,func.count(Traffic.id)).group_by(Traffic.status_code).order_by(Traffic.status_code).all()
        active = query.with_entities(Traffic.method,Traffic.endpoint,func.count(Traffic.id).label('count')).group_by(Traffic.method,Traffic.endpoint).order_by(func.count(Traffic.id).desc(),Traffic.endpoint).limit(5).all()
        ids = query.with_entities(Traffic.id).subquery()
        findings = db.query(Alert.alert_type,func.count(Alert.id)).filter(Alert.related_event_id.in_(db.query(ids.c.id))).group_by(Alert.alert_type).all()
        return dict(total_requests=total, unique_endpoints=unique, period=period, group=group, bucket_seconds=seconds,
                    series=[dict(timestamp=datetime.fromtimestamp(t,timezone.utc).isoformat(),count=n) for t,n in series],
                    groups=[dict(label=label,count=n) for label,n in grouped], most_active=[dict(method=m,endpoint=p,count=n) for m,p,n in active],
                    responses=[dict(status_code=code,count=n) for code,n in responses], findings=[dict(detector=kind,count=n) for kind,n in findings],
                    recent=[traffic_record(row) for row in query.order_by(Traffic.id.desc()).limit(5)],
                    evaluated_at=datetime.now(timezone.utc).isoformat())

@router.get('/requests')
def request_page(period: str = Query('all', pattern='^(all|15|60|1440)$'), search: str = Query('', max_length=256),
                 method: str = Query('all', pattern='^(all|GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$'), status: str = Query('all', pattern='^(all|[1-5])$'),
                 start: str | None = None, end: str | None = None, page: int = Query(1,ge=1,le=1000000), page_size: int = Query(25,ge=1,le=100),
                 sort: str = Query('time',pattern='^(time|endpoint|status)$'), order: str = Query('desc',pattern='^(asc|desc)$')):
    with db_client.SessionLocal() as db:
        query = filtered(db,period,search,method,status,start,end)
        total = query.count()
        column = {'time': cast(func.strftime('%s',Traffic.timestamp),Integer), 'endpoint': Traffic.endpoint, 'status': Traffic.status_code}[sort]
        rows = query.order_by(column.asc() if order=='asc' else column.desc(),Traffic.id.asc() if order=='asc' else Traffic.id.desc()).offset((page-1)*page_size).limit(page_size).all()
        return dict(total=total,page=page,page_size=page_size,items=[traffic_record(row) for row in rows])
