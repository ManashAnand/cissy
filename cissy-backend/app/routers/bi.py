"""BI endpoints — schema registration and queries (to be expanded)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.db.duckdb import get_duckdb
from app.models.pydantic.bi import ColumnSchema, SchemaResponse, TableSchema
from app.services import bi_service
from app.services.instacart_dataset import resolve_instacart_view

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
    """Read-only SQL (SELECT / WITH / EXPLAIN)."""

    sql: str = Field(..., min_length=1, description="DuckDB SQL to execute")


class SqlQueryResponse(BaseModel):
    columns: list[str]
    rows: list[list[Any]]


@router.get("/schema", response_model=SchemaResponse)
def get_schema(conn=Depends(get_duckdb)) -> SchemaResponse:
    """List tables/views in the main schema and their columns (for LLM / UI)."""
    try:
        raw = bi_service.fetch_schema(conn)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    tables = [
        TableSchema(
            name=t["name"],
            columns=[ColumnSchema(**c) for c in t["columns"]],
        )
        for t in raw
    ]
    return SchemaResponse(tables=tables)


@router.get("/preview/{dataset}", response_model=SqlQueryResponse)
def preview_dataset(
    dataset: str,
    conn=Depends(get_duckdb),
    limit: int = Query(10, ge=1, le=1000, description="Max rows to return"),
) -> SqlQueryResponse:
    """
    Run `SELECT * FROM <view> LIMIT n` for an Instacart table.
    `dataset` can be the view name (e.g. `products`), CSV name (`products.csv`),
    or CSV stem (`order_products__prior`).
    """
    view = resolve_instacart_view(dataset)
    if view is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown dataset: {dataset!r}. Use /api/v1/bi/schema for valid names.",
        )
    sql = f'SELECT * FROM "{view}" LIMIT {limit}'
    try:
        columns, rows = bi_service.execute_safe_select(conn, sql)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return SqlQueryResponse(columns=columns, rows=[list(r) for r in rows])


@router.post("/query", response_model=SqlQueryResponse)
def run_query(body: SqlQueryBody, conn=Depends(get_duckdb)) -> SqlQueryResponse:
    """Execute a single read-only query against DuckDB."""
    sql = body.sql.strip()
    if not sql:
        raise HTTPException(status_code=400, detail="Empty SQL")
    try:
        columns, rows = bi_service.execute_safe_select(conn, sql)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return SqlQueryResponse(columns=columns, rows=[list(r) for r in rows])
