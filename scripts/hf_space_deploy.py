#!/usr/bin/env python3
"""
Deploy FastAPI backend to Hugging Face Spaces (Docker SDK) and set frontend env automatically.

Requirements:
- huggingface-hub (already in root requirements.txt)
- Valid HF token with write access.

Usage:
  python scripts/hf_space_deploy.py --space-id <username/space-name> --origins http://localhost:5173,https://your-frontend.example.com --token <hf_token>

Notes:
- This script creates (or reuses) the Space with SDK=docker and uploads Dockerfile, app.py, requirements.txt.
- It attempts to set ALLOW_ORIGINS as a Space secret (available as env in runtime).
- It computes the Space URL and writes/updates .env.local with VITE_CLOUD_ENGINE_URL.
- GPU tier selection cannot be set via this script; configure it in the Space UI (Hardware tab).
"""

import argparse
import os
import sys
from pathlib import Path
from typing import Optional

try:
    from huggingface_hub import HfApi
except Exception as e:
    print("ERROR: huggingface_hub is required. Install via 'pip install huggingface-hub'.")
    raise

ROOT = Path(__file__).resolve().parent.parent


def ensure_files() -> None:
    app_py = ROOT / "app.py"
    req = ROOT / "requirements.txt"
    dockerfile = ROOT / "Dockerfile"
    if not app_py.exists():
        raise FileNotFoundError(f"Missing {app_py}. It should import the FastAPI app from backend/app.py.")
    if not req.exists():
        raise FileNotFoundError(f"Missing {req}. Root requirements.txt is required for Spaces runtime.")
    if not dockerfile.exists():
        raise FileNotFoundError(f"Missing {dockerfile}. Docker spaces require a Dockerfile.")


def compute_space_url(space_id: str) -> str:
    # Spaces public URL pattern: https://owner-repo.hf.space
    owner_repo = space_id.replace("/", "-")
    return f"https://{owner_repo}.hf.space"


def update_env_local(space_url: str) -> None:
    env_path = ROOT / ".env.local"
    lines = []
    if env_path.exists():
        with env_path.open("r", encoding="utf-8") as f:
            lines = f.read().splitlines()

    # Replace or add VITE_CLOUD_ENGINE_URL
    found = False
    for i, line in enumerate(lines):
        if line.strip().startswith("VITE_CLOUD_ENGINE_URL="):
            lines[i] = f"VITE_CLOUD_ENGINE_URL={space_url}"
            found = True
            break
    if not found:
        lines.append(f"VITE_CLOUD_ENGINE_URL={space_url}")

    with env_path.open("w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def set_space_secret(api: HfApi, space_id: str, key: str, value: str) -> bool:
    """
    Try to set a Space secret. Secrets are exposed as env variables
    for the app at runtime, similar to variables.
    """
    try:
        api.add_space_secret(repo_id=space_id, key=key, value=value)
        return True
    except Exception as exc:
        print(f"Warning: Unable to set Space secret {key}: {exc}")
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Deploy backend to Hugging Face Space.")
    parser.add_argument("--space-id", required=True, help="Space identifier in the form 'username/space-name'.")
    parser.add_argument("--token", default=os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACEHUB_API_TOKEN"),
                        help="Hugging Face write token. Can also be provided via HF_TOKEN env.")
    parser.add_argument("--origins", default="http://localhost:5173", help="Comma-separated frontend origins for CORS.")
    args = parser.parse_args()

    ensure_files()

    if not args.token:
        print("ERROR: Hugging Face token is required. Provide via --token or HF_TOKEN env.")
        return 2

    api = HfApi(token=args.token)

    # Create or reuse Space with Docker SDK
    try:
        api.create_repo(repo_id=args.space_id, repo_type="space", exist_ok=True, space_sdk="docker")
        print(f"Space ensured (Docker SDK): {args.space_id}")
    except Exception as exc:
        print(f"ERROR: Could not create/ensure Space: {exc}")
        return 3

    # Upload Dockerfile, app.py, requirements.txt, and backend/ to Space root
    try:
        api.upload_file(
            path_or_fileobj=str(ROOT / "Dockerfile"),
            repo_id=args.space_id,
            path_in_repo="Dockerfile",
            repo_type="space",
        )
        api.upload_file(
            path_or_fileobj=str(ROOT / "app.py"),
            repo_id=args.space_id,
            path_in_repo="app.py",
            repo_type="space",
        )
        api.upload_file(
            path_or_fileobj=str(ROOT / "requirements.txt"),
            repo_id=args.space_id,
            path_in_repo="requirements.txt",
            repo_type="space",
        )
        # Upload backend folder containing FastAPI app
        backend_dir = ROOT / "backend"
        if not backend_dir.exists():
            raise FileNotFoundError(f"Missing backend folder at {backend_dir}")
        api.upload_folder(
            repo_id=args.space_id,
            folder_path=str(backend_dir),
            path_in_repo="backend",
            repo_type="space",
        )
        print("Uploaded Dockerfile, app.py, requirements.txt, and backend/ to Space.")
    except Exception as exc:
        print(f"ERROR: Upload failed: {exc}")
        return 4

    # Attempt to set ALLOW_ORIGINS as Space secret (exposed as env variable)
    ok_secret = set_space_secret(api, args.space_id, "ALLOW_ORIGINS", args.origins)
    if ok_secret:
        print(f"Set ALLOW_ORIGINS secret to: {args.origins}")
    else:
        print("Please set ALLOW_ORIGINS in Space Settings -> Variables manually.")

    # Compute Space URL and update .env.local
    space_url = compute_space_url(args.space_id)
    update_env_local(space_url)
    print(f"Space URL: {space_url}")
    print(f"Updated .env.local with VITE_CLOUD_ENGINE_URL={space_url}")

    print("\nNext steps:")
    print("1) In the Space Settings -> Hardware, select a GPU tier if you want CUDA acceleration (optional).")
    print("2) The Space will build the Docker image automatically; wait until it's running.")
    print("3) In your frontend, run the dev server after .env.local update to use the cloud engine.")
    print("4) Use Engine Mode = Cloud or Auto (fallback) in the UI to route requests.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())