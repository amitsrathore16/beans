import os
import json
import time
import urllib.request
from typing import Optional
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

_JWKS_TTL      = 3600   # seconds — refresh public keys hourly
_JWKS_TIMEOUT  = 5      # seconds — urlopen hard timeout
_jwks_cache:    Optional[dict] = None
_jwks_fetched_at: float = 0.0


def _get_jwks(*, force_refresh: bool = False) -> dict:
    global _jwks_cache, _jwks_fetched_at
    if force_refresh or _jwks_cache is None or (time.monotonic() - _jwks_fetched_at) > _JWKS_TTL:
        url = f"{os.environ['SUPABASE_URL']}/auth/v1/.well-known/jwks.json"
        with urllib.request.urlopen(url, timeout=_JWKS_TIMEOUT) as resp:
            _jwks_cache = json.loads(resp.read())
            _jwks_fetched_at = time.monotonic()
    return _jwks_cache


def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Malformed token: {e}")

    alg = header.get("alg", "")
    opts = {"verify_aud": False}

    try:
        if alg == "HS256":
            payload = jwt.decode(
                token,
                os.environ["SUPABASE_JWT_SECRET"],
                algorithms=["HS256"],
                options=opts,
            )
        elif alg in ("RS256", "ES256"):
            try:
                payload = jwt.decode(
                    token,
                    _get_jwks(),
                    algorithms=["RS256", "ES256"],
                    options=opts,
                )
            except JWTError:
                # Verification failed — may be a mid-TTL key rotation.
                # Refresh the JWKS cache and retry exactly once.
                payload = jwt.decode(
                    token,
                    _get_jwks(force_refresh=True),
                    algorithms=["RS256", "ES256"],
                    options=opts,
                )
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Unsupported algorithm: {alg}")

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing sub claim")
        return user_id

    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid or expired token: {e}")
