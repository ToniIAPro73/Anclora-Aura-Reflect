import os
import sys

# Robust import: try package import first, then direct module from backend folder
try:
    from backend.app import app  # type: ignore
except Exception:
    BASE_DIR = os.path.dirname(__file__)
    BACKEND_DIR = os.path.join(BASE_DIR, "backend")
    if BACKEND_DIR not in sys.path:
        sys.path.insert(0, BACKEND_DIR)
    from app import app  # type: ignore

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", "7860"))
    uvicorn.run(app, host="0.0.0.0", port=port)