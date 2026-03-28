"""Unit tests for Instacart dataset name resolution."""

import pytest

from app.services.instacart_dataset import resolve_instacart_view


@pytest.mark.parametrize(
    ("user", "expected"),
    [
        ("products", "products"),
        ("Products", "products"),
        ("products.csv", "products"),
        ("order_products_prior", "order_products_prior"),
        ("order_products__prior", "order_products_prior"),
        ("order_products__prior.csv", "order_products_prior"),
        ("aisles", "aisles"),
    ],
)
def test_resolve_instacart_view_ok(user: str, expected: str) -> None:
    assert resolve_instacart_view(user) == expected


def test_resolve_instacart_view_unknown() -> None:
    assert resolve_instacart_view("nope") is None
    assert resolve_instacart_view("") is None

