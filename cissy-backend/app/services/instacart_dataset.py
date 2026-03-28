"""Register Instacart CSVs as DuckDB views over data/csv/*.csv."""

from __future__ import annotations

import logging
from pathlib import Path
from duckdb import DuckDBPyConnection

from app.config import settings

logger = logging.getLogger(__name__)

# SQL view name -> CSV filename (Kaggle layout)
INSTACART_VIEWS: tuple[tuple[str, str], ...] = (
    ("aisles", "aisles.csv"),
    ("departments", "departments.csv"),
    ("orders", "orders.csv"),
    ("order_products_prior", "order_products__prior.csv"),
    ("order_products_train", "order_products__train.csv"),
    ("products", "products.csv"),
)


def resolve_instacart_view(name: str) -> str | None:
    """
    Map a user-provided label to the DuckDB view name.
    Accepts view names (e.g. order_products_prior), CSV filenames (products.csv),
    or CSV stems (e.g. order_products__prior). Case-insensitive.
    """
    key = name.strip()
    if key.lower().endswith(".csv"):
        key = key[:-4].strip()
    if not key:
        return None
    key_lower = key.lower()
    for view, csv_file in INSTACART_VIEWS:
        if key_lower == view.lower():
            return view
        stem = Path(csv_file).stem
        if key_lower == stem.lower():
            return view
    return None


def _escape_path(path: Path) -> str:
    return str(path.resolve()).replace("'", "''")


def register_instacart_views(conn: DuckDBPyConnection) -> dict[str, bool]:
    """
    Create or replace views pointing at read_csv_auto for each present CSV.
    Missing files are skipped (logged); returns view_name -> registered.
    """
    base = settings.data_csv_dir.resolve()
    if not base.is_dir():
        logger.warning("Instacart CSV directory does not exist: %s", base)
        return {name: False for name, _ in INSTACART_VIEWS}

    registered: dict[str, bool] = {}
    for view_name, filename in INSTACART_VIEWS:
        csv_path = base / filename
        if not csv_path.is_file():
            logger.warning("Skipping missing Instacart file: %s", csv_path)
            registered[view_name] = False
            continue
        escaped = _escape_path(csv_path)
        sql = (
            f'CREATE OR REPLACE VIEW "{view_name}" AS '
            f"SELECT * FROM read_csv_auto('{escaped}', header=true, auto_detect=true)"
        )
        conn.execute(sql)
        registered[view_name] = True
        logger.info("Registered view %s <- %s", view_name, filename)

    ok = sum(1 for v in registered.values() if v)
    logger.info("Instacart views registered: %s / %s", ok, len(INSTACART_VIEWS))
    return registered
