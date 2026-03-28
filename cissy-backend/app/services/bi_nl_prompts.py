"""System instructions + schema text for NL→SQL (Instacart / DuckDB)."""

from __future__ import annotations

from typing import Any

# Rules the model must follow (keep in sync with markdown/conversational_bi_nl_sql_plan.md).
INSTACART_RULES = """
Data semantics (Instacart):
- **orders**: order_id, user_id, eval_set ('prior' | 'train' | 'test'), order_number, order_dow,
  order_hour_of_day, days_since_prior_order (NULL on a user's first order — exclude from AVG when appropriate).
- **order_products_prior** / **order_products_train**: order_id, product_id, add_to_cart_order, reordered (0/1).
  For questions about "all orders" or "all line items", you may UNION BOTH with a literal column split_set IN ('prior','train')
  or filter orders by eval_set and join the matching line table. State assumptions briefly in reasoning.
- **products**: product_id, product_name, aisle_id, department_id
- **aisles**, **departments**: dimension tables for hierarchy product → aisle → department.

SQL rules:
- DuckDB dialect. Single SELECT statement; CTEs (WITH) allowed.
- Read-only: SELECT / WITH only. No DDL/DML.
- Prefer aggregates + GROUP BY + ORDER BY + LIMIT for large tables (especially line-item tables).
- Qualify column names when joining. Use meaningful aliases.
"""


def format_schema_markdown(schema_tables: list[dict[str, Any]]) -> str:
    """Turn fetch_schema() output into a compact markdown block for the LLM."""
    lines: list[str] = ["## Available tables and columns\n"]
    for t in schema_tables:
        name = t.get("name", "?")
        cols = t.get("columns") or []
        col_str = ", ".join(
            f"{c.get('name', '?')} ({c.get('data_type', '') or '?'})" for c in cols
        )
        lines.append(f"- **{name}**: {col_str}\n")
    return "".join(lines)
