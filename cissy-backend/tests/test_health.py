import pytest
from fastapi.testclient import TestClient

from app.server import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_health(client: TestClient):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_bi_ready(client: TestClient):
    r = client.get("/api/v1/bi/ready")
    assert r.status_code == 200
    assert r.json()["duckdb"] == "ok"


def test_bi_query_select(client: TestClient):
    r = client.post(
        "/api/v1/bi/query",
        json={"sql": "SELECT 1 AS n"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["columns"] == ["n"]
    assert body["rows"] == [[1]]
