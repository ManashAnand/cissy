#!/usr/bin/env python3
"""
Download Instacart Market Basket Analysis from Kaggle into cissy-backend/data/csv.

Requires Kaggle API credentials (same as `kaggle` CLI):
  ~/.kaggle/kaggle.json  with {"username":"...","key":"..."}
or env vars KAGGLE_USERNAME / KAGGLE_KEY (see Kaggle docs).

Usage (from repo root):
  python scripts/download_instacart_kaggle.py
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CSV_DIR = REPO_ROOT / "data" / "csv"
DATASET = "psparks/instacart-market-basket-analysis"


def main() -> None:
    import kagglehub

    CSV_DIR.mkdir(parents=True, exist_ok=True)
    path = kagglehub.dataset_download(
        DATASET,
        output_dir=str(CSV_DIR),
    )
    print("Path to dataset files:", path)
    print("CSV dir:", CSV_DIR.resolve())


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
