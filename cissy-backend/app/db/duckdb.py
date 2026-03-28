"""DuckDB connection lifecycle — single shared connection per process."""

from __future__ import annotations

import duckdb
from duckdb import DuckDBPyConnection

from app.config import settings

_connection: DuckDBPyConnection | None = None


def init_duckdb() -> DuckDBPyConnection:
    """Open (or create) the database file and return the connection."""
    global _connection
    if _connection is not None:
        return _connection
    path_str = str(settings.duckdb_path)
    if path_str != ":memory:":
        settings.duckdb_path.parent.mkdir(parents=True, exist_ok=True)
    settings.data_csv_dir.mkdir(parents=True, exist_ok=True)
    _connection = duckdb.connect(path_str)
    return _connection


def get_duckdb() -> DuckDBPyConnection:
    """Return the active connection; raises if lifespan did not initialize."""
    if _connection is None:
        raise RuntimeError("DuckDB not initialized; ensure app lifespan runs.")
    return _connection


def shutdown_duckdb() -> None:
    """Close the connection on shutdown."""
    global _connection
    if _connection is not None:
        _connection.close()
        _connection = None
