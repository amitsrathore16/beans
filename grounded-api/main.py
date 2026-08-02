import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

# Must run before importing first-party modules: several of them (e.g. dependencies.py)
# read env vars at import time, so .env has to be loaded first.
load_dotenv()

from limiter import limiter
from routers import logs, inventory

# Build the CORS origin allowlist from explicit environment config.
# ALLOWED_ORIGINS: comma-separated list of additional production/preview origins.
# Never use a wildcard subdomain — anyone can register *.vercel.app.
_extra = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
_origins = ["https://grounded.app"] + _extra
if os.getenv("ENVIRONMENT") in ("development", "test"):
    _origins.extend(["http://localhost:5173", "http://127.0.0.1:5173"])

app = FastAPI(title="Grounded API", version="1.0.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(logs.router)
app.include_router(inventory.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
