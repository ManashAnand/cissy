"""GET /dashboard — stats + project cards + job_ids."""

from fastapi.testclient import TestClient

from app.server import app


def test_dashboard_empty():
    with TestClient(app) as client:
        r = client.get("/api/v1/dashboard")
        assert r.status_code == 200
        data = r.json()
        assert "stats" in data
        assert "projects" in data
        assert "job_ids" in data
        assert data["job_ids"] == []
        assert data["projects"] == []
        assert data["stats"]["total_projects"]["main_value"] == "0"


def test_dashboard_with_conversation():
    with TestClient(app) as client:
        created = client.post("/api/v1/conversations", json={}).json()
        jid = created["job_id"]

        r = client.get("/api/v1/dashboard")
        assert r.status_code == 200
        data = r.json()
        assert jid in data["job_ids"]
        assert len(data["projects"]) == 1
        card = data["projects"][0]
        assert card["job_id"] == jid
        assert "last_updated" in card
        assert card["title"] == "BI Analysis"
        assert data["stats"]["total_projects"]["main_value"] == "1"
