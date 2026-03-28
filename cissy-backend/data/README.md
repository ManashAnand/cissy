# Local data (`cissy-backend/data/`)

Dataset files for the conversational BI backend live **here**, not in the monorepo parent next to `cissy-frontend`.

| Path | Purpose |
|------|---------|
| `instacart.duckdb` | DuckDB database (created when the API runs; gitignored) |
| `csv/` | Place Instacart (or other) CSV exports here (gitignored) |

Override locations with `DUCKDB_PATH` and `DATA_CSV_DIR` in `.env` if needed.
