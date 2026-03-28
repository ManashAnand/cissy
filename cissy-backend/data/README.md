# Local data (`cissy-backend/data/`)

Dataset files for the conversational BI backend live **here**, not in the monorepo parent next to `cissy-frontend`.

| Path | Purpose |
|------|---------|
| `instacart.duckdb` | DuckDB database (created when the API runs; gitignored) |
| `csv/` | Instacart CSVs (gitignored) — use the download script or copy files here |

Override locations with `DUCKDB_PATH` and `DATA_CSV_DIR` in `.env` if needed.

### Download Instacart from Kaggle

From `cissy-backend` (requires [Kaggle API credentials](https://www.kaggle.com/docs/api), e.g. `~/.kaggle/kaggle.json`):

```bash
python scripts/download_instacart_kaggle.py
```

Files are written under `data/csv/`.

### DuckDB views

When the API starts, it registers **views** over each CSV that exists: `aisles`, `departments`, `orders`, `order_products_prior`, `order_products_train`, `products`. Query them with read-only SQL via `POST /api/v1/bi/query` or inspect names and columns with `GET /api/v1/bi/schema`.
