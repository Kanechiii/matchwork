"""Fail-closed bearer authentication for paid Matchwork inference endpoints."""
import hmac
import os
from fastapi import Header, HTTPException, status


def require_ai_access(authorization: str | None = Header(default=None)) -> None:
    key = os.getenv("MATCHWORK_API_ACCESS_TOKEN", "")
    if len(key) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Paid intelligence endpoint not configured",
        )
    scheme, separator, supplied = (authorization or "").partition(" ")
    if not separator or scheme.lower() != "bearer" or not hmac.compare_digest(
        supplied.encode(), key.encode()
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
