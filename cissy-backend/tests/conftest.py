"""Use in-memory DuckDB during tests so the dev DB file is not locked."""

import os
import tempfile

import pytest

# Force before any `from app...` import so Settings() picks this over .env
os.environ["DUCKDB_PATH"] = ":memory:"
os.environ["DATA_CSV_DIR"] = tempfile.mkdtemp(prefix="cissy-csv-")


@pytest.fixture(autouse=True)
def _reset_duckdb_singleton():
    """Each test gets a fresh in-memory DB (lifespan opens/closes per client)."""
    import app.db.duckdb as ddb

    ddb.shutdown_duckdb()
    yield
    ddb.shutdown_duckdb()
