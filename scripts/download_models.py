#!/usr/bin/env python3
"""Utility script to pre-download Stable Diffusion model weights for offline use."""

import argparse
import os
from pathlib import Path

from huggingface_hub import snapshot_download

DEFAULT_MODELS = [
    "stabilityai/stable-diffusion-xl-base-1.0",
    "stabilityai/stable-diffusion-xl-refiner-1.0",
    "runwayml/stable-diffusion-v1-5",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download Stable Diffusion models to a local directory.")
    parser.add_argument(
        "--model",
        action="append",
        default=[],
        help="Model repository to download (can be specified multiple times). Defaults to a curated set.",
    )
    parser.add_argument(
        "--output-dir",
        default=os.environ.get("SD_MODELS_DIR", "models"),
        help="Directory where the models should be stored.",
    )
    parser.add_argument(
        "--revision",
        default=None,
        help="Optional model revision or branch to download.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    targets = args.model or DEFAULT_MODELS

    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    for model in targets:
        print(f"Downloading {model} ...")
        snapshot_download(repo_id=model, local_dir=output_dir / model.replace('/', '_'), revision=args.revision)

    print("Download complete.")


if __name__ == "__main__":
    main()
