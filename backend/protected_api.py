"""Deterministic synthetic upstream for the local networking demonstration."""
from fastapi import FastAPI, Header, HTTPException, Response
from pydantic import BaseModel, Field

app = FastAPI(title="HYPERION Protected Synthetic API")
USERS = {
    "user_101": {"id": "user_101", "name": "Synthetic Ada", "account_id": "account_101"},
    "user_202": {"id": "user_202", "name": "Synthetic Ben", "account_id": "account_202"},
}
BALANCES = {"account_101": 1250, "account_202": 890}
TOKENS = {"Bearer demo-user-101": "user_101", "Bearer demo-user-202": "user_202"}


def caller(authorization):
    return TOKENS.get(authorization or "")


def mark(response, owner, user):
    response.headers["X-Demo-Owner"] = owner
    response.headers["X-Demo-Permission"] = "allow" if user == owner else "deny"


@app.get("/health")
def health():
    return {"status": "ok", "data": "synthetic"}


@app.get("/api/v1/users/{user_id}")
def user(user_id: str, response: Response, authorization: str | None = Header(None)):
    if user_id not in USERS:
        raise HTTPException(404, "Synthetic user not found")
    mark(response, user_id, caller(authorization))
    # Intentional synthetic authorization defect for BOLA demonstration.
    return USERS[user_id]


@app.get("/api/v1/users/{user_id}/balance")
def balance(user_id: str, response: Response, authorization: str | None = Header(None)):
    if user_id not in USERS:
        raise HTTPException(404, "Synthetic user not found")
    mark(response, user_id, caller(authorization))
    if caller(authorization) != user_id:
        response.status_code = 403
        return {"detail": "Synthetic owner mismatch"}
    return {"account_id": USERS[user_id]["account_id"], "balance": BALANCES[USERS[user_id]["account_id"]]}


@app.get("/api/v1/accounts/{account_id}")
def account(account_id: str, response: Response, authorization: str | None = Header(None)):
    if account_id not in BALANCES:
        raise HTTPException(404, "Synthetic account not found")
    owner = "user_" + account_id.split("_")[-1]
    mark(response, owner, caller(authorization))
    if caller(authorization) != owner:
        response.status_code = 403
        return {"detail": "Synthetic owner mismatch"}
    return {"id": account_id, "balance": BALANCES[account_id]}


class Payment(BaseModel):
    from_account_id: str
    to_account_id: str
    amount: int = Field(gt=0, le=10000)


@app.post("/api/v1/payments")
def payment(payload: Payment, response: Response, authorization: str | None = Header(None)):
    if payload.from_account_id not in BALANCES or payload.to_account_id not in BALANCES:
        raise HTTPException(422, "Use synthetic account IDs")
    owner = "user_" + payload.from_account_id.split("_")[-1]
    mark(response, owner, caller(authorization))
    if caller(authorization) != owner:
        response.status_code = 403
        return {"detail": "Synthetic account ownership mismatch"}
    return {"receipt": "synthetic-only", "amount": payload.amount, "processed": False}


@app.get("/api/v2/debug")
def shadow_debug():
    return {"message": "Synthetic undocumented route"}
