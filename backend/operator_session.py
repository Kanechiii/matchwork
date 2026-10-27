"""Opt-in operator browser sessions. Not multi-user authentication.

A human operator must supply a separate high-entropy browser-login credential,
never bundled in JS. No credential is returned to the browser. The session is
stateless, signed, short-lived, secure/HttpOnly, and bound to an explicit Origin.
This is a controlled-demo gateway, NOT production identity or a spending cap.
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from urllib.parse import urlsplit

from fastapi import HTTPException, Request, Response
from pydantic import BaseModel, Field

COOKIE = "matchwork_operator_session"
TTL = 15 * 60


class OperatorLogin(BaseModel):
    access_code: str = Field(min_length=1, max_length=256)


def _config():
    if os.getenv("MATCHWORK_BROWSER_SESSION_ENABLED", "false").lower() not in ("true", "1"):
        raise HTTPException(404, "Browser sessions disabled")
    origin = os.getenv("MATCHWORK_PUBLIC_ORIGIN", "").rstrip("/")
    login = os.getenv("MATCHWORK_BROWSER_LOGIN_TOKEN", "")
    key = os.getenv("MATCHWORK_SESSION_SIGNING_KEY", "")
    parsed = urlsplit(origin)
    if (parsed.scheme != "https" or not parsed.hostname or parsed.username
            or parsed.password or parsed.path not in ("", "/")
            or parsed.query or parsed.fragment or len(login) < 32 or len(key) < 32):
        raise HTTPException(503, "Browser authentication not configured")
    return origin, login, key


def _same_origin(request: Request, expected: str) -> bool:
    origin = request.headers.get("origin", "")
    return origin == expected


def _encode(payload: dict, key: str) -> str:
    data = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    ).rstrip(b"=").decode()
    signature = hmac.new(key.encode(), data.encode(), hashlib.sha256).hexdigest()
    return data + "." + signature


def _decode(value: str, key: str) -> dict | None:
    try:
        data, signature = value.split(".")
        expected = hmac.new(key.encode(), data.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            return None
        payload = json.loads(base64.urlsafe_b64decode(data + "=" * (-len(data) % 4)))
        if not isinstance(payload, dict):
            return None
        return payload
    except (ValueError, TypeError, UnicodeDecodeError):
        return None


def start_operator_session(request: Request, response: Response, login: OperatorLogin):
    origin, credential, key = _config()
    if not _same_origin(request, origin):
        raise HTTPException(403, "Origin rejected")
    if not hmac.compare_digest(login.access_code.encode(), credential.encode()):
        raise HTTPException(401, "Authentication required")
    csrf = secrets.token_urlsafe(24)
    token = _encode({"exp": int(time.time()) + TTL, "csrf": csrf}, key)
    response.set_cookie(
        COOKIE, token, httponly=True, secure=True, samesite="strict",
        max_age=TTL, path="/api",
    )
    response.headers["Cache-Control"] = "no-store"
    return {"status": "authenticated", "csrf_token": csrf, "expires_in": TTL}


def end_operator_session(response: Response):
    response.delete_cookie(COOKIE, path="/api", secure=True, httponly=True, samesite="strict")
    response.headers["Cache-Control"] = "no-store"
    return {"status": "signed_out"}


def require_operator_session(request: Request):
    origin, _credential, key = _config()
    if not _same_origin(request, origin):
        raise HTTPException(403, "Origin rejected")
    raw = request.cookies.get(COOKIE, "")
    if not raw or len(raw) > 1024:
        raise HTTPException(401, "Authentication required")
    payload = _decode(raw, key)
    if (not payload or type(payload.get("exp")) is not int
            or payload["exp"] <= int(time.time())
            or not isinstance(payload.get("csrf"), str)):
        raise HTTPException(401, "Authentication required")
    supplied_csrf = request.headers.get("x-matchwork-csrf", "")
    if not hmac.compare_digest(supplied_csrf, payload["csrf"]):
        raise HTTPException(403, "CSRF validation failed")
