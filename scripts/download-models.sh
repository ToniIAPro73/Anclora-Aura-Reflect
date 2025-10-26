#!/usr/bin/env bash
set -euo pipefail

PYTHON_BIN="${DIFFUSION_PYTHON_PATH:-${PYTHON:-python3}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"${PYTHON_BIN}" "${SCRIPT_DIR}/download_models.py" "$@"
