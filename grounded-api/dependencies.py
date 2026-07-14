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

# Algorithm is fixed from server config — never read from the (attacker-controlled) token header.
# Set SUPABASE_JWT_ALG=RS256 for Supabase projects using asymmetric signing.
_EXPECTED_ALG = os.getenv("SUPABASE_JWT_ALG", "HS256")
_JWT_AUDIENCE = "authenticated"


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
        if _EXPECTED_ALG == "HS256":
            payload = jwt.decode(
                token,
                os.environ["SUPABASE_JWT_SECRET"],
                algorithms=["HS256"],
                audience=_JWT_AUDIENCE,
            )
        elif _EXPECTED_ALG in ("RS256", "ES256"):
            try:
                payload = jwt.decode(
                    token,
                    _get_jwks(),
                    algorithms=["RS256", "ES256"],
                    audience=_JWT_AUDIENCE,
                )
            except JWTError:
                # Verification failed — may be a mid-TTL key rotation.
                # Refresh the JWKS cache and retry exactly once.
                payload = jwt.decode(
                    token,
                    _get_jwks(force_refresh=True),
                    algorithms=["RS256", "ES256"],
                    audience=_JWT_AUDIENCE,
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Server misconfiguration: unknown SUPABASE_JWT_ALG '{_EXPECTED_ALG}'",
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing sub claim")
        return user_id

    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid or expired token: {e}")
