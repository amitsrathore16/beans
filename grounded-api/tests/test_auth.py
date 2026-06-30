from helpers import make_token


def test_missing_token_returns_401(client):
    response = client.get("/api/v1/beans/match?name=test&dose_g=18")
    assert response.status_code == 401


def test_expired_token_returns_401(client):
    token = make_token(expired=True)
    response = client.get(
        "/api/v1/beans/match?name=test&dose_g=18",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401


def test_wrong_secret_returns_401(client):
    token = make_token(secret="completely-wrong-secret-that-wont-work")
    response = client.get(
        "/api/v1/beans/match?name=test&dose_g=18",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401


def test_valid_token_passes_auth(client, monkeypatch):
    from database import get_supabase

    class FakeResult:
        data = []

    class FakeTable:
        def select(self, *a): return self
        def eq(self, *a): return self
        def is_(self, *a): return self
        def execute(self): return FakeResult()

    class FakeDB:
        def table(self, name): return FakeTable()

    monkeypatch.setattr("routers.inventory.get_supabase", lambda: FakeDB())

    token = make_token()
    response = client.get(
        "/api/v1/beans/match?name=Unknown&dose_g=18",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["matched"] is False
