import pytest
from unittest.mock import MagicMock, patch
from helpers import make_token

USER_ID = "user-123"
LOG_ID = "log-abc-123"
CAFE_LOG_ID = "log-cafe-456"


def auth_header():
    return {"Authorization": f"Bearer {make_token(user_id=USER_ID)}"}


def _make_db(logs=None, beans=None):
    """Return a fake supabase client seeded with log/bean rows."""
    log_rows = logs if logs is not None else []
    bean_rows = beans if beans is not None else []

    class FakeQuery:
        def __init__(self, rows):
            self._rows = rows
            self._inserted = None

        def select(self, *a): return self
        def insert(self, data):
            self._inserted = data
            new_row = {**data, "id": LOG_ID}
            self._rows = [new_row]
            return self
        def eq(self, *a): return self
        def is_(self, *a): return self
        def ilike(self, *a): return self
        def limit(self, *a): return self
        def execute(self):
            result = MagicMock()
            result.data = self._rows
            return result

    class FakeDB:
        def __init__(self):
            self._logs = FakeQuery(log_rows)
            self._beans = FakeQuery(bean_rows)

        def table(self, name):
            if name == "logs":
                return self._logs
            return self._beans

    return FakeDB()


# ── POST /api/v1/logs ──────────────────────────────────────────────────────────

class TestSaveLog:
    def test_cafe_log_returns_no_inventory_match(self, client, monkeypatch):
        db = _make_db()
        monkeypatch.setattr("routers.logs.get_supabase", lambda: db)

        resp = client.post("/api/v1/logs", json={
            "log": {"log_type": "cafe", "coffee_name": "Test Blend",
                    "cafe_name": "Blue Bottle"},
            "deduct_inventory": False,
        }, headers=auth_header())

        assert resp.status_code == 200
        data = resp.json()
        assert data["log_id"] == LOG_ID
        assert data["inventory_match"] is None

    def test_home_log_no_bean_match_returns_no_inventory_match(self, client, monkeypatch):
        db = _make_db(beans=[])
        monkeypatch.setattr("routers.logs.get_supabase", lambda: db)

        resp = client.post("/api/v1/logs", json={
            "log": {"log_type": "home", "coffee_name": "Ethiopia Yirgacheffe",
                    "dose_g": 18.0},
            "deduct_inventory": True,
        }, headers=auth_header())

        assert resp.status_code == 200
        assert resp.json()["inventory_match"] is None

    def test_home_log_with_bean_match_returns_inventory_match(self, client, monkeypatch):
        bean = {"id": "bean-1", "name": "Ethiopia Yirgacheffe",
                "remaining_weight_g": 245.0, "user_id": USER_ID, "deleted_at": None}
        db = _make_db(beans=[bean])
        monkeypatch.setattr("routers.logs.get_supabase", lambda: db)

        resp = client.post("/api/v1/logs", json={
            "log": {"log_type": "home", "coffee_name": "Ethiopia Yirgacheffe",
                    "dose_g": 18.0},
            "deduct_inventory": True,
        }, headers=auth_header())

        assert resp.status_code == 200
        match = resp.json()["inventory_match"]
        assert match is not None
        assert match["bean_id"] == "bean-1"
        assert match["remaining_before_g"] == 245.0
        assert match["remaining_after_g"] == 227.0
        assert match["low_stock_warning"] is False

    def test_low_stock_warning_when_remaining_under_50g(self, client, monkeypatch):
        bean = {"id": "bean-1", "name": "Kenya AA",
                "remaining_weight_g": 60.0, "user_id": USER_ID, "deleted_at": None}
        db = _make_db(beans=[bean])
        monkeypatch.setattr("routers.logs.get_supabase", lambda: db)

        resp = client.post("/api/v1/logs", json={
            "log": {"log_type": "home", "coffee_name": "Kenya AA", "dose_g": 18.0},
            "deduct_inventory": True,
        }, headers=auth_header())

        assert resp.status_code == 200
        assert resp.json()["inventory_match"]["low_stock_warning"] is True

    def test_bean_match_is_case_insensitive(self, client, monkeypatch):
        bean = {"id": "bean-1", "name": "Ethiopia Yirgacheffe",
                "remaining_weight_g": 200.0, "user_id": USER_ID, "deleted_at": None}
        db = _make_db(beans=[bean])
        monkeypatch.setattr("routers.logs.get_supabase", lambda: db)

        resp = client.post("/api/v1/logs", json={
            "log": {"log_type": "home", "coffee_name": "ethiopia yirgacheffe",
                    "dose_g": 18.0},
            "deduct_inventory": True,
        }, headers=auth_header())

        assert resp.status_code == 200
        assert resp.json()["inventory_match"] is not None

    def test_invalid_rating_rejected(self, client, monkeypatch):
        resp = client.post("/api/v1/logs", json={
            "log": {"log_type": "home", "coffee_name": "Test", "rating": 6},
            "deduct_inventory": False,
        }, headers=auth_header())
        assert resp.status_code == 422

    def test_unauthenticated_returns_401(self, client):
        resp = client.post("/api/v1/logs", json={
            "log": {"log_type": "home", "coffee_name": "Test"},
            "deduct_inventory": False,
        })
        assert resp.status_code == 401

    # ── New field tests ────────────────────────────────────────────────────────

    def test_new_coffee_identity_fields_accepted(self, client, monkeypatch):
        db = _make_db()
        monkeypatch.setattr("routers.logs.get_supabase", lambda: db)

        resp = client.post("/api/v1/logs", json={
            "log": {
                "log_type": "home",
                "roaster": "Blue Tokai",
                "coffee_name": "Attikan Estate",
                "coffee_type": "Single Origin",
                "origin_country": "India",
                "origin_region": "Attikan Estate, Coorg",
                "species": "100% Arabica",
                "process_method": "Washed",
                "varietal": "SL28",
                "roast_level": "Medium",
                "roast_date": "2026-06-15",
            },
            "deduct_inventory": False,
        }, headers=auth_header())

        assert resp.status_code == 200

    def test_monsooned_process_method_accepted(self, client, monkeypatch):
        db = _make_db()
        monkeypatch.setattr("routers.logs.get_supabase", lambda: db)

        resp = client.post("/api/v1/logs", json={
            "log": {
                "log_type": "home",
                "coffee_name": "Monsoon Malabar AA",
                "process_method": "Monsooned",
            },
            "deduct_inventory": False,
        }, headers=auth_header())

        assert resp.status_code == 200

    def test_equipment_and_ratio_fields_accepted(self, client, monkeypatch):
        db = _make_db()
        monkeypatch.setattr("routers.logs.get_supabase", lambda: db)

        resp = client.post("/api/v1/logs", json={
            "log": {
                "log_type": "home",
                "coffee_name": "Monsoon Malabar",
                "brew_method": "Espresso",
                "equipment": "Breville Barista Express",
                "dose_g": 18.0,
                "coffee_water_ratio": "1:2",
                "ideal_yield_g": 36.0,
                "actual_yield_g": 38.0,
            },
            "deduct_inventory": False,
        }, headers=auth_header())

        assert resp.status_code == 200

    def test_sensory_profile_object_accepted(self, client, monkeypatch):
        db = _make_db()
        monkeypatch.setattr("routers.logs.get_supabase", lambda: db)

        resp = client.post("/api/v1/logs", json={
            "log": {
                "log_type": "home",
                "coffee_name": "Kenya Kirinyaga",
                "sensory_profile": {
                    "aroma": ["Floral", "Fruity"],
                    "flavour": ["Citrus", "Berry"],
                    "acidity": ["Bright"],
                    "body": "Medium",
                    "bitterness": "Low",
                    "mouthfeel": "Silky",
                    "finish": ["Lingering", "Sweet"],
                },
            },
            "deduct_inventory": False,
        }, headers=auth_header())

        assert resp.status_code == 200

    def test_sensory_profile_stored_as_dict(self, client, monkeypatch):
        inserted = {}

        class CapturingQuery:
            def __init__(self, rows): self._rows = rows
            def select(self, *a): return self
            def insert(self, data):
                inserted.update(data)
                self._rows = [{**data, "id": LOG_ID}]
                return self
            def eq(self, *a): return self
            def is_(self, *a): return self
            def execute(self):
                r = MagicMock(); r.data = self._rows; return r

        class CapturingDB:
            def table(self, _): return CapturingQuery([])

        monkeypatch.setattr("routers.logs.get_supabase", lambda: CapturingDB())

        profile = {"aroma": ["Nutty"], "body": "Full", "finish": ["Clean"]}
        client.post("/api/v1/logs", json={
            "log": {"log_type": "home", "coffee_name": "Test", "sensory_profile": profile},
            "deduct_inventory": False,
        }, headers=auth_header())

        assert inserted.get("sensory_profile") == profile


# ── POST /api/v1/logs/{id}/duplicate ──────────────────────────────────────────

class TestDuplicateLog:
    HOME_SOURCE = {
        "id": LOG_ID, "user_id": USER_ID, "log_type": "home",
        "roaster": "Blue Tokai",
        "coffee_name": "Attikan Estate",
        "coffee_type": "Single Origin",
        "origin_country": "India",
        "origin_region": "Attikan Estate, Coorg",
        "species": "100% Arabica",
        "process_method": "Washed",
        "varietal": "SL28",
        "roast_level": "Medium",
        "roast_date": "2026-06-15",
        "brew_method": "Espresso",
        "equipment": "Breville Barista Express",
        "dose_g": 18.0,
        "coffee_water_ratio": "1:2",
        "ideal_yield_g": 36.0,
        "actual_yield_g": 38.0,
        "grind_size": "Fine",
        "brew_time_s": 28,
        "sensory_profile": {
            "aroma": ["Chocolatey"],
            "flavour": ["Caramel"],
            "body": "Full",
            "finish": ["Lingering"],
        },
        "rating": 4,
        "notes": "Great shot",
        "created_at": "2026-06-30T00:00:00", "updated_at": "2026-06-30T00:00:00",
        "deleted_at": None,
    }

    def test_exact_duplicate_copies_all_fields(self, client, monkeypatch):
        db = _make_db(logs=[self.HOME_SOURCE])
        monkeypatch.setattr("routers.logs.get_supabase", lambda: db)

        resp = client.post(f"/api/v1/logs/{LOG_ID}/duplicate",
                           json={"mode": "exact"}, headers=auth_header())

        assert resp.status_code == 200
        data = resp.json()
        assert "new_log_id" in data
        assert data["mode"] == "exact"

    def test_exact_duplicate_sets_duplicated_from(self, client, monkeypatch):
        inserted = {}

        class CapturingQuery:
            def __init__(self, rows): self._rows = rows
            def select(self, *a): return self
            def insert(self, data):
                inserted.update(data)
                self._rows = [{**data, "id": "new-log-id"}]
                return self
            def eq(self, *a): return self
            def is_(self, *a): return self
            def execute(self):
                r = MagicMock(); r.data = self._rows; return r

        class CapturingDB:
            def table(self, _): return CapturingQuery([TestDuplicateLog.HOME_SOURCE])

        monkeypatch.setattr("routers.logs.get_supabase", lambda: CapturingDB())

        client.post(f"/api/v1/logs/{LOG_ID}/duplicate",
                    json={"mode": "exact"}, headers=auth_header())

        assert inserted.get("duplicated_from") == LOG_ID

    def test_log_with_changes_clears_sensory_fields(self, client, monkeypatch):
        cleared = {}

        class CapturingQuery:
            def __init__(self, rows): self._rows = rows
            def select(self, *a): return self
            def insert(self, data):
                cleared.update(data)
                self._rows = [{**data, "id": "new-log-id"}]
                return self
            def eq(self, *a): return self
            def is_(self, *a): return self
            def execute(self):
                r = MagicMock(); r.data = self._rows; return r

        class CapturingDB:
            def table(self, _): return CapturingQuery([TestDuplicateLog.HOME_SOURCE])

        monkeypatch.setattr("routers.logs.get_supabase", lambda: CapturingDB())

        resp = client.post(f"/api/v1/logs/{LOG_ID}/duplicate",
                           json={"mode": "log_with_changes"}, headers=auth_header())

        assert resp.status_code == 200
        for field in ("sensory_profile", "rating", "notes"):
            assert field not in cleared, f"{field} should be cleared in log_with_changes mode"

    def test_log_with_changes_keeps_extraction_fields(self, client, monkeypatch):
        kept = {}

        class CapturingQuery:
            def __init__(self, rows): self._rows = rows
            def select(self, *a): return self
            def insert(self, data):
                kept.update(data)
                self._rows = [{**data, "id": "new-log-id"}]
                return self
            def eq(self, *a): return self
            def is_(self, *a): return self
            def execute(self):
                r = MagicMock(); r.data = self._rows; return r

        class CapturingDB:
            def table(self, _): return CapturingQuery([TestDuplicateLog.HOME_SOURCE])

        monkeypatch.setattr("routers.logs.get_supabase", lambda: CapturingDB())

        client.post(f"/api/v1/logs/{LOG_ID}/duplicate",
                    json={"mode": "log_with_changes"}, headers=auth_header())

        assert kept.get("dose_g") == 18.0
        assert kept.get("actual_yield_g") == 38.0
        assert kept.get("coffee_water_ratio") == "1:2"
        assert kept.get("grind_size") == "Fine"
        assert kept.get("brew_time_s") == 28
        assert kept.get("equipment") == "Breville Barista Express"

    def test_log_with_changes_keeps_coffee_identity_fields(self, client, monkeypatch):
        kept = {}

        class CapturingQuery:
            def __init__(self, rows): self._rows = rows
            def select(self, *a): return self
            def insert(self, data):
                kept.update(data)
                self._rows = [{**data, "id": "new-log-id"}]
                return self
            def eq(self, *a): return self
            def is_(self, *a): return self
            def execute(self):
                r = MagicMock(); r.data = self._rows; return r

        class CapturingDB:
            def table(self, _): return CapturingQuery([TestDuplicateLog.HOME_SOURCE])

        monkeypatch.setattr("routers.logs.get_supabase", lambda: CapturingDB())

        client.post(f"/api/v1/logs/{LOG_ID}/duplicate",
                    json={"mode": "log_with_changes"}, headers=auth_header())

        assert kept.get("roaster") == "Blue Tokai"
        assert kept.get("coffee_name") == "Attikan Estate"
        assert kept.get("coffee_type") == "Single Origin"
        assert kept.get("origin_country") == "India"
        assert kept.get("brew_method") == "Espresso"

    def test_cafe_log_duplicate_returns_422(self, client, monkeypatch):
        cafe_source = {**TestDuplicateLog.HOME_SOURCE, "id": CAFE_LOG_ID, "log_type": "cafe"}
        db = _make_db(logs=[cafe_source])
        monkeypatch.setattr("routers.logs.get_supabase", lambda: db)

        resp = client.post(f"/api/v1/logs/{CAFE_LOG_ID}/duplicate",
                           json={"mode": "exact"}, headers=auth_header())

        assert resp.status_code == 422
        assert "home brew" in resp.json()["detail"].lower()

    def test_nonexistent_log_returns_404(self, client, monkeypatch):
        db = _make_db(logs=[])
        monkeypatch.setattr("routers.logs.get_supabase", lambda: db)

        resp = client.post("/api/v1/logs/no-such-id/duplicate",
                           json={"mode": "exact"}, headers=auth_header())

        assert resp.status_code == 404

    def test_unauthenticated_returns_401(self, client):
        resp = client.post(f"/api/v1/logs/{LOG_ID}/duplicate", json={"mode": "exact"})
        assert resp.status_code == 401
