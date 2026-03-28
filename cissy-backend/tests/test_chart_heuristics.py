"""Chart hints: type heuristics + xValues / yValues / dataPoints for rendering."""

from app.services.chart_heuristics import MAX_PIE_SLICES, suggest_chart


def test_suggest_chart_pie_small_category_count():
    cols = ["department", "order_volume"]
    rows = [
        ("produce", 100),
        ("dairy", 50),
    ]
    ch = suggest_chart(cols, rows)
    assert ch is not None
    assert ch["type"] == "pie"
    assert ch["xKey"] == "department"
    assert ch["yKey"] == "order_volume"
    assert ch["xValues"] == ["produce", "dairy"]
    assert ch["yValues"] == [100, 50]
    assert ch["dataPoints"][0] == {"x": "produce", "y": 100}


def test_suggest_chart_bar_when_too_many_slices():
    cols = ["department", "order_volume"]
    rows = [("d", i) for i in range(MAX_PIE_SLICES + 1)]
    ch = suggest_chart(cols, rows)
    assert ch is not None
    assert ch["type"] == "bar"
    assert len(ch["dataPoints"]) == MAX_PIE_SLICES + 1


def test_suggest_chart_line_date_and_numeric():
    cols = ["order_date", "total"]
    rows = [
        ("2024-01-01", 10),
        ("2024-01-02", 20),
    ]
    ch = suggest_chart(cols, rows)
    assert ch is not None
    assert ch["type"] == "line"
    assert ch["xKey"] == "order_date"
    assert ch["yKey"] == "total"


def test_suggest_chart_line_date_in_column_name():
    cols = ["snapshot_date", "revenue"]
    rows = [
        ("x", 1),  # first row value not ISO; name still triggers date axis
        ("2024-01-01", 10),
    ]
    ch = suggest_chart(cols, rows)
    assert ch is not None
    assert ch["type"] == "line"


def test_suggest_chart_scatter_two_numeric():
    cols = ["price", "quantity"]
    rows = [
        (10.5, 3),
        (20.0, 1),
    ]
    ch = suggest_chart(cols, rows)
    assert ch is not None
    assert ch["type"] == "scatter"
    assert ch["xKey"] == "price"
    assert ch["yKey"] == "quantity"
    assert ch["dataPoints"][0] == {"x": 10.5, "y": 3}


def test_suggest_chart_swapped_category_numeric_pie():
    cols = ["revenue", "region"]
    rows = [
        (100, "west"),
        (200, "east"),
    ]
    ch = suggest_chart(cols, rows)
    assert ch is not None
    assert ch["type"] == "pie"
    assert ch["xKey"] == "region"
    assert ch["yKey"] == "revenue"
