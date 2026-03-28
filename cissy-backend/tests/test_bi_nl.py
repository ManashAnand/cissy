"""NL→SQL helpers (no live OpenAI — conftest clears OPENAI_API_KEY)."""

import pytest

from app.services.bi_service import (
    ALLOWED_INSTACART_TABLES,
    extract_table_names_from_sql,
    validate_instacart_tables_only,
)


def test_extract_tables_basic():
    sql = 'SELECT * FROM orders o JOIN products p ON o.user_id = p.product_id'
    names = extract_table_names_from_sql(sql)
    assert "orders" in names
    assert "products" in names


def test_validate_rejects_unknown_table():
    with pytest.raises(ValueError, match="disallowed tables"):
        validate_instacart_tables_only("SELECT * FROM secret_table")


def test_validate_allows_instacart_table():
    validate_instacart_tables_only("SELECT COUNT(*) FROM orders")


def test_validate_select_one_no_from():
    validate_instacart_tables_only("SELECT 1 AS n")


def test_allowed_set_matches_instacart_views():
    assert "orders" in ALLOWED_INSTACART_TABLES
    assert "conversations" not in ALLOWED_INSTACART_TABLES
