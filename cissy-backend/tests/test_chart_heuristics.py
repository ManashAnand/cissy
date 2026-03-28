"""Chart hints include xValues / yValues / dataPoints for frontend rendering."""

from app.services.chart_heuristics import suggest_chart


def test_suggest_chart_includes_series():
    cols = ["department", "order_volume"]
    rows = [
        ("produce", 100),
        ("dairy", 50),
    ]
    ch = suggest_chart(cols, rows)
    assert ch is not None
    assert ch["xKey"] == "department"
    assert ch["yKey"] == "order_volume"
    assert ch["xValues"] == ["produce", "dairy"]
    assert ch["yValues"] == [100, 50]
    assert len(ch["dataPoints"]) == 2
    assert ch["dataPoints"][0] == {"x": "produce", "y": 100}
