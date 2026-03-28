from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Cissy Backend"
    debug: bool = False

    # API — routes use this prefix; set root_path when behind a proxy that strips it
    api_v1_prefix: str = "/api/v1"
    root_path: str = ""  # env: ROOT_PATH

    # All paths below are relative to the backend repo root (where uvicorn runs).

    # DuckDB database file; parent dirs created at startup
    duckdb_path: Path = Path("./data/instacart.duckdb")

    # Raw CSVs (e.g. Instacart) — directory created at startup; contents gitignored
    data_csv_dir: Path = Path("./data/csv")


settings = Settings()
