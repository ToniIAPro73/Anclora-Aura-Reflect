# Aura Reflect Image Service

This directory contains the FastAPI backend and tooling for Aura Reflect's image generation features.

## Getting started

1. Create a Python virtual environment (optional but recommended):

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

2. Install the dependencies:

   ```bash
   pip install -r server/requirements.txt
   ```

3. Run the FastAPI development server:

   ```bash
   uvicorn app.main:app --reload
   ```

   The server exposes a `GET /health` endpoint for liveness checks.

## Image generation quick test

Use the helper script to validate the configured text-to-image and image-to-image pipelines:

```bash
python server/scripts/quick_test.py
```

### Environment variables

- `DIFFUSERS_MODEL_ID` – Overrides the default model repository used for both pipelines.
- `DIFFUSERS_MODEL_PATH` – Points to a local directory containing the model weights. Useful when network access to the Hugging Face Hub is not available.

The script stores the generated PNG files in `server/outputs/` and prints the runtime for each pipeline.

> [!NOTE]
> Downloading checkpoints from the Hugging Face Hub requires outbound network access and acceptance of the model license. If the environment is behind a restrictive proxy, download the model ahead of time and set `DIFFUSERS_MODEL_PATH` to the local directory.
