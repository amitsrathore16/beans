import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import logs, inventory

load_dotenv()

# Build the CORS origin allowlist from explicit environment config.
# ALLOWED_ORIGINS: comma-separated list of additional production/preview origins.
# Never use a wildcard subdomain — anyone can register *.vercel.app.
_extra = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
_origins = ["https://grounded.app"] + _extra
if os.getenv("ENVIRONMENT") == "development":
    _origins.append("http://localhost:5173")

app = FastAPI(title="Grounded API", version="1.0.0")

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
