import os
import time
from jose import jwt


def make_token(secret: str = None, expired: bool = False, user_id: str = "user-123") -> str:
    secret = secret or os.environ.get("SUPABASE_JWT_SECRET", "test-jwt-secret-that-is-long-enough-32chars")
    exp = int(time.time()) + (-10 if expired else 3600)
    payload = {"sub": user_id, "aud": "authenticated", "exp": exp}
    return jwt.encode(payload, secret, algorithm="HS256")
