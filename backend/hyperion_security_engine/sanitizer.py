'''Sanitizer module for security engine'''
from __future__ import annotations
import json
from typing import Dict
from .event import APIEvent
__all__ = ["sanitize_event"]
def sanitize_event(event: APIEvent) -> Dict[str, object]:
    data = event.to_dict()
    try:
        headers = json.loads(data.get('headers') or '{}')
    except Exception:
        headers = {}
    headers.pop('Authorization', None)
    headers.pop('Cookie', None)
    data['headers'] = json.dumps(headers)
    try:
        r_headers = json.loads(data.get('response_headers') or '{}')
    except Exception:
        r_headers = {}
    r_headers.pop('Authorization', None)
    r_headers.pop('Cookie', None)
    data['response_headers'] = json.dumps(r_headers)
    body = data.get('body')
    if body:
        data['body'] = body.replace('password', '<REDACTED>').replace('api_key', '<REDACTED>')
    resp_body = data.get('response_body')
    if resp_body:
        data['response_body'] = resp_body.replace('password', '<REDACTED>').replace('api_key', '<REDACTED>')
    return data
