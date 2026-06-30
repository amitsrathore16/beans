import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add tests dir to path so helpers.py is importable
sys.path.insert(0, os.path.dirname(__file__))

os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret-that-is-long-enough-32chars")

from main import app  # noqa: E402 — env vars must be set first
from helpers import make_token  # noqa: E402


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers():
    token = make_token()
    return {"Authorization": f"Bearer {token}"}
