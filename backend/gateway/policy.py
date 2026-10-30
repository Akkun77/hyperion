"""Bounded method/path policy for the synthetic protected API."""
import re

# Deliberately separate from arbitrary Connect API registrations. These are the
# operations implemented by protected_api.py and are the only gateway allowlist.
PROTECTED_ROUTES = {
    "GET:/health",
    "GET:/api/v1/users/{id}",
    "GET:/api/v1/users/{id}/balance",
    "GET:/api/v1/accounts/{id}",
    "POST:/api/v1/payments",
}
METHODS = ("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS")
_SAFE_PATH = re.compile(r"^/(?:[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*)?$")


def gateway_path(request):
    """Reject ambiguous encodings instead of attempting to decode twice."""
    raw = request.scope.get("raw_path", b"")
    try:
        raw = raw.decode("ascii", "strict")
    except UnicodeDecodeError:
        return None
    if raw == "/gateway":
        path = "/"
    elif raw.startswith("/gateway/"):
        path = raw[len("/gateway"):]
    else:
        return None
    if len(path) > 512 or "%" in path or "\\" in path or "//" in path or not _SAFE_PATH.fullmatch(path):
        return None
    return path


def classify(method, normalized_path):
    return f"{method}:{normalized_path.rstrip('/') or '/'}" in PROTECTED_ROUTES


def synthetic_identity(auth_header):
    # Fixed classroom credentials, not real authentication.
    return {
        "Bearer demo-user-101": "user_101",
        "Bearer demo-user-202": "user_202",
    }.get(auth_header)


def parameter_mismatch(method, normalized_path, body, identity):
    if method != "POST" or normalized_path != "/api/v1/payments" or not identity:
        return False
    try:
        import json
        data = json.loads(body)
    except (ValueError, UnicodeDecodeError, TypeError):
        return False
    source = data.get("from_account_id") if isinstance(data, dict) else None
    return isinstance(source, str) and source in ("account_101", "account_202") and source != "account_" + identity.split("_")[-1]
