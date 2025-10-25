from fastapi import FastAPI

app = FastAPI(title="Aura Reflect Image Service")


@app.get("/health", summary="Health check endpoint")
def health_check() -> dict[str, str]:
    """Simple health check endpoint."""
    return {"status": "ok"}
