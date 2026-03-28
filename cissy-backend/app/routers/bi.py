"""BI endpoints — schema registration and queries (to be expanded)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db.duckdb import get_duckdb
from app.services import bi_service

router = APIRouter()


class ReadyResponse(BaseModel):
    duckdb: str = Field(..., description="DuckDB probe result")


@router.get("/ready", response_model=ReadyResponse)
def ready(conn=Depends(get_duckdb)) -> ReadyResponse:
    try:
        status = bi_service.ping_db(conn)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return ReadyResponse(duckdb=status)


class SqlQueryBody(BaseModel):
    """Temporary: raw SQL for development; replace with NL→SQL later."""

    sql: str = Field(..., min_length=1, description="DuckDB SQL to execute")


class SqlQueryResponse(BaseModel):
    columns: list[str]
    rows: list[list[Any]]


@router.post("/query", response_model=SqlQueryResponse)
def run_query(body: SqlQueryBody, conn=Depends(get_duckdb)) -> SqlQueryResponse:
    """
    Execute SQL against DuckDB (dev harness).
    Harden with statement allowlists / read-only enforcement before production use.
    """
    sql = body.sql.strip()
    if not sql:
        raise HTTPException(status_code=400, detail="Empty SQL")
    try:
        columns, rows = bi_service.execute_sql(conn, sql)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    # Serialize rows as lists for JSON
    return SqlQueryResponse(columns=columns, rows=[list(r) for r in rows])
