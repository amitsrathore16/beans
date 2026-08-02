from unittest.mock import MagicMock
from helpers import make_token

USER_ID = "user-123"
BEAN_ID = "bean-abc-123"
LOG_ID = "log-abc-123"


def auth_header():
    return {"Authorization": f"Bearer {make_token(user_id=USER_ID)}"}


def _fake_db(beans=None, events_inserted=None):
    """Return a fake supabase client. events_inserted is a list that captures inserts."""
    bean_rows = [dict(b) for b in (beans or [])]

    class FakeRpcQuery:
        def __init__(self, data):
            self._data = data

        def execute(self):
            r = MagicMock()
            r.data = self._data
            return r

    class FakeBeanQuery:
        def __init__(self):
            self._rows = list(bean_rows)

        def select(self, *a): return self
        def eq(self, *a): return self
        def is_(self, *a): return self
        def ilike(self, *a): return self
        def limit(self, *a): return self

        def execute(self):
            r = MagicMock()
            r.data = self._rows
            return r

    class FakeEventQuery:
        def insert(self, data):
            if events_inserted is not None:
                events_inserted.append(data)
            return self

        def execute(self):
            r = MagicMock()
            r.data = [{}]
            return r

    class FakeDB:
        def __init__(self):
            self._beans = FakeBeanQuery()
            self._events = FakeEventQuery()

        def table(self, name):
            if name == "beans":
                return self._beans
            return self._events

        def rpc(self, fn_name, params):
            """Simulate deduct_bean_stock: atomic check-and-subtract."""
            if fn_name != "deduct_bean_stock":
                return FakeRpcQuery([])

            p_bean_id = params["p_bean_id"]
            p_user_id = params["p_user_id"]
            p_dose_g  = params["p_dose_g"]

            match = next(
                (b for b in bean_rows
                 if b["id"] == p_bean_id and b["user_id"] == p_user_id),
                None,
            )
            if match is None:
                return FakeRpcQuery([])  # caller maps to 404

            weight_before = match["remaining_weight_g"]
            if weight_before < p_dose_g:
                return FakeRpcQuery([{
                    "remaining_weight_g": weight_before,
                    "weight_before_g":    weight_before,
                    "success":            False,
                }])

            new_remaining = weight_before - p_dose_g
            match["remaining_weight_g"] = new_remaining  # mutate in-place (simulates UPDATE)
            return FakeRpcQuery([{
                "remaining_weight_g": new_remaining,
                "weight_before_g":    weight_before,
                "success":            True,
            }])

    return FakeDB()


# ── GET /api/v1/beans/match ────────────────────────────────────────────────────

class TestBeanMatch:
    BEAN = {
        "id": BEAN_ID,
        "name": "Ethiopia Yirgacheffe",
        "remaining_weight_g": 245.0,
        "user_id": USER_ID,
        "deleted_at": None,
    }

    def test_no_match_returns_matched_false(self, client, monkeypatch):
        monkeypatch.setattr("routers.inventory.get_supabase", lambda: _fake_db(beans=[]))

        resp = client.get("/api/v1/beans/match?name=Unknown+Bean&dose_g=18",
                          headers=auth_header())

        assert resp.status_code == 200
        assert resp.json() == {"matched": False}

    def test_exact_name_match_returns_bean(self, client, monkeypatch):
        monkeypatch.setattr("routers.inventory.get_supabase",
                            lambda: _fake_db(beans=[self.BEAN]))

        resp = client.get("/api/v1/beans/match?name=Ethiopia+Yirgacheffe&dose_g=18",
                          headers=auth_header())

        assert resp.status_code == 200
        data = resp.json()
        assert data["matched"] is True
        assert data["bean_id"] == BEAN_ID
        assert data["bean_name"] == "Ethiopia Yirgacheffe"
        assert data["remaining_before_g"] == 245.0
        assert data["remaining_after_g"] == 227.0

    def test_match_is_case_insensitive(self, client, monkeypatch):
        monkeypatch.setattr("routers.inventory.get_supabase",
                            lambda: _fake_db(beans=[self.BEAN]))

        resp = client.get("/api/v1/beans/match?name=ethiopia+yirgacheffe&dose_g=18",
                          headers=auth_header())

        assert resp.status_code == 200
        assert resp.json()["matched"] is True

    def test_low_stock_warning_false_when_plenty_remaining(self, client, monkeypatch):
        monkeypatch.setattr("routers.inventory.get_supabase",
                            lambda: _fake_db(beans=[self.BEAN]))

        resp = client.get("/api/v1/beans/match?name=Ethiopia+Yirgacheffe&dose_g=18",
                          headers=auth_header())

        assert resp.json()["low_stock_warning"] is False

    def test_low_stock_warning_true_when_projected_under_50g(self, client, monkeypatch):
        lean_bean = {**self.BEAN, "remaining_weight_g": 60.0}
        monkeypatch.setattr("routers.inventory.get_supabase",
                            lambda: _fake_db(beans=[lean_bean]))

        resp = client.get("/api/v1/beans/match?name=Ethiopia+Yirgacheffe&dose_g=18",
                          headers=auth_header())

        assert resp.json()["low_stock_warning"] is True
        assert resp.json()["remaining_after_g"] == 42.0

    def test_unauthenticated_returns_401(self, client):
        resp = client.get("/api/v1/beans/match?name=Test&dose_g=18")
        assert resp.status_code == 401


# ── POST /api/v1/inventory/deduct ─────────────────────────────────────────────

class TestInventoryDeduct:
    BEAN = {
        "id": BEAN_ID,
        "name": "Ethiopia Yirgacheffe",
        "remaining_weight_g": 245.0,
        "user_id": USER_ID,
        "deleted_at": None,
    }

    def _payload(self, dose_g=18.0):
        return {"bean_id": BEAN_ID, "log_id": LOG_ID, "dose_g": dose_g}

    def test_successful_deduction_returns_new_weight(self, client, monkeypatch):
        monkeypatch.setattr("routers.inventory.get_supabase",
                            lambda: _fake_db(beans=[dict(self.BEAN)]))

        resp = client.post("/api/v1/inventory/deduct",
                           json=self._payload(), headers=auth_header())

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["remaining_weight_g"] == 227.0
        assert data["low_stock_warning"] is False

    def test_insufficient_stock_returns_422(self, client, monkeypatch):
        low_bean = {**self.BEAN, "remaining_weight_g": 10.0}
        monkeypatch.setattr("routers.inventory.get_supabase",
                            lambda: _fake_db(beans=[low_bean]))

        resp = client.post("/api/v1/inventory/deduct",
                           json=self._payload(dose_g=18.0), headers=auth_header())

        assert resp.status_code == 422
        assert "10" in resp.json()["detail"]
        assert "18" in resp.json()["detail"]

    def test_deduction_writes_inventory_event(self, client, monkeypatch):
        captured = []
        monkeypatch.setattr("routers.inventory.get_supabase",
                            lambda: _fake_db(beans=[dict(self.BEAN)],
                                             events_inserted=captured))

        client.post("/api/v1/inventory/deduct",
                    json=self._payload(), headers=auth_header())

        assert len(captured) == 1
        event = captured[0]
        assert event["bean_id"] == BEAN_ID
        assert event["log_id"] == LOG_ID
        assert event["delta_g"] == -18.0
        assert event["weight_before_g"] == 245.0
        assert event["weight_after_g"] == 227.0
        assert event["source"] == "brew_save"

    def test_low_stock_warning_on_deduction(self, client, monkeypatch):
        bean = {**self.BEAN, "remaining_weight_g": 60.0}
        monkeypatch.setattr("routers.inventory.get_supabase",
                            lambda: _fake_db(beans=[bean]))

        resp = client.post("/api/v1/inventory/deduct",
                           json=self._payload(dose_g=18.0), headers=auth_header())

        assert resp.status_code == 200
        assert resp.json()["low_stock_warning"] is True
        assert resp.json()["remaining_weight_g"] == 42.0

    def test_exact_stock_match_succeeds(self, client, monkeypatch):
        """Deducting exactly what remains should succeed (remaining = 0)."""
        bean = {**self.BEAN, "remaining_weight_g": 18.0}
        monkeypatch.setattr("routers.inventory.get_supabase",
                            lambda: _fake_db(beans=[bean]))

        resp = client.post("/api/v1/inventory/deduct",
                           json=self._payload(dose_g=18.0), headers=auth_header())

        assert resp.status_code == 200
        assert resp.json()["remaining_weight_g"] == 0.0

    def test_bean_not_found_returns_404(self, client, monkeypatch):
        monkeypatch.setattr("routers.inventory.get_supabase",
                            lambda: _fake_db(beans=[]))

        resp = client.post("/api/v1/inventory/deduct",
                           json=self._payload(), headers=auth_header())

        assert resp.status_code == 404

    def test_unauthenticated_returns_401(self, client):
        resp = client.post("/api/v1/inventory/deduct", json=self._payload())
        assert resp.status_code == 401
