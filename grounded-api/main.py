import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import logs, inventory

load_dotenv()

app = FastAPI(title="Grounded API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://grounded.app",
        "https://*.vercel.app",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(logs.router)
app.include_router(inventory.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
