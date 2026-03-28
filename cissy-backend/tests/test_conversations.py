"""Conversation + POST /query API (job_id)."""

from fastapi.testclient import TestClient

from app.server import app


def test_create_and_list_conversations():
    with TestClient(app) as client:
        r = client.post("/api/v1/conversations", json={})
        assert r.status_code == 200
        data = r.json()
        assert "job_id" in data
        assert data["label"] == "New chat"
        jid = data["job_id"]

        r2 = client.get("/api/v1/conversations")
        assert r2.status_code == 200
        listed = r2.json()["conversations"]
        assert any(c["job_id"] == jid for c in listed)


def test_query_creates_conversation_when_no_job_id():
    with TestClient(app) as client:
        r = client.post(
            "/api/v1/query",
            json={"message": "Hello"},
        )
        assert r.status_code == 200
        body = r.json()
        assert "job_id" in body
        assert body["error"] is None
        assert body["insight"]

        msgs = client.get(
            f"/api/v1/conversations/{body['job_id']}/messages",
        ).json()["messages"]
        assert len(msgs) == 2
        assert msgs[0]["role"] == "user"
        assert msgs[1]["role"] == "assistant"


def test_query_unknown_job_id_404():
    with TestClient(app) as client:
        r = client.post(
            "/api/v1/query",
            json={
                "message": "Hi",
                "job_id": "00000000-0000-0000-0000-000000000001",
            },
        )
        assert r.status_code == 404


def test_conversation_id_alias():
    with TestClient(app) as client:
        created = client.post("/api/v1/conversations", json={}).json()
        jid = created["job_id"]

        r = client.post(
            "/api/v1/query",
            json={"message": "Follow up", "conversationId": jid},
        )
        assert r.status_code == 200
        assert r.json()["job_id"] == jid


def test_delete_conversation():
    with TestClient(app) as client:
        jid = client.post("/api/v1/conversations", json={}).json()["job_id"]
        d = client.delete(f"/api/v1/conversations/{jid}")
        assert d.status_code == 204
        assert d.content == b""

        listed = client.get("/api/v1/conversations").json()["conversations"]
        assert not any(c["job_id"] == jid for c in listed)

        assert client.delete(f"/api/v1/conversations/{jid}").status_code == 404


def test_delete_conversation_unknown():
    with TestClient(app) as client:
        r = client.delete(
            "/api/v1/conversations/00000000-0000-0000-0000-000000000099"
        )
        assert r.status_code == 404
