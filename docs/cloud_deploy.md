# Cloud Deployment Guide (Hugging Face Spaces - FastAPI)

This guide shows how to deploy the existing FastAPI backend (backend/app.py) to Hugging Face Spaces so you can use it as a zero-cost/cloud fallback engine.

## 1) Prepare files

Use the backend already in this repository:
- `backend/app.py` (FastAPI application)
- `backend/requirements.txt` (Python dependencies)

For Spaces, it’s simplest to place these two files at the repository root for the Space:
- Copy `backend/app.py` → `app.py` (root of the Space)
- Copy `backend/requirements.txt` → `requirements.txt` (root of the Space)

You can keep the same code; it already runs uvicorn in `if __name__ == "__main__"`.

## 2) Create the Space

- Go to https://huggingface.co/spaces
- Click “Create new Space”
- Fill in:
  - Space name: e.g., `your-username/aura-reflect-engine`
  - Visibility: Public (recommended for zero-cost usage)
  - SDK: **“Static (Docker)”** or **“Python”**
    - Use “Python” for a simpler setup.

## 3) Upload files

- In the new Space repo, upload:
  - `app.py` (FastAPI app copied from `backend/app.py`)
  - `requirements.txt` (copied from `backend/requirements.txt`)
- Commit changes.

## 4) Set the runtime command

Spaces with Python SDK run “gradio/streamlit” by default. For FastAPI:
- In the Space settings, set the **“App file”** to `app.py` and **Command** to:

```
python app.py
```

Alternatively, to control the port explicitly (7860 is the default public port in Spaces):

```
python -c "import uvicorn; uvicorn.run('app:app', host='0.0.0.0', port=7860)"
```

Note: The provided `app.py` already runs uvicorn on `0.0.0.0:8000` if executed as `python app.py`. If you prefer the Spaces default port (7860), use the alternative command above.

## 5) Configure CORS

The backend reads allowed origins from the environment variable `ALLOW_ORIGINS` (comma-separated).
- Example: set `ALLOW_ORIGINS=https://your-frontend.example.com, http://localhost:5173`

In Spaces, go to **Settings → Variables** and add:
- `ALLOW_ORIGINS`: your frontend origins (comma-separated)

This will allow your frontend to call the Space API from the browser.

## 6) GPU and performance

- In Spaces **Hardware** tab, select a GPU tier (e.g., T4, A10G) to enable CUDA acceleration. Free tiers may have limitations.
- Recommended environment variables for faster generation:
  - `SD_MODEL_ID`: use a base model suited to your deployment
    - For speed/quality trade-off at few steps with LCM-LoRA: `runwayml/stable-diffusion-v1-5`
    - For SDXL (higher-quality, heavier): `stabilityai/stable-diffusion-xl-base-1.0`
  - `SD_LCM_LORA_ID`: e.g., `latent-consistency/lcm-lora-sdv1-5` (or `latent-consistency/lcm-lora-sdxl`)
  - `SD_PRECISION`: `fp16` (on GPU) or `auto`
  - `SD_DEVICE`: `cuda` (Spaces GPU)
  - Optional: `TORCH_COMPILE=1` (PyTorch 2+) for small speedups
- You can set environment variables in **Settings → Variables**.

## 7) API endpoints

Once the Space is running, it will expose:
- POST `/generate`
  - JSON: `{ "prompt": string, "aspectRatio": string, "temperature": number, "resolution": "high"|"standard" }`
  - Returns: `{ "images": [ "<base64>", ... ] }`
- POST `/refine`
  - JSON: `{ "refinePrompt": string, "images": [ "<base64>", ... ], "config"?: { "steps"?: number, "guidanceScale"?: number } }`
  - Returns: `{ "images": [ "<base64>", ... ] }`
- GET `/health`
  - Returns basic diagnostics (device, model, scheduler, optimizations)

Note:
- The frontend (this repo) now supports selecting “Cloud” mode and will send `resolution: "high"` for `/generate`. Local mode uses tuned VRAM-safe dimensions.

## 8) Configure the frontend

In your frontend `.env.local`:
- `VITE_CLOUD_ENGINE_URL=https://your-username-aura-reflect-engine.hf.space`
- Ensure your frontend origin is allowed by the Space via `ALLOW_ORIGINS`.

With the UI:
- Use “Cloud” mode to force cloud engine.
- Use “Auto (fallback)” mode to prefer local and fallback to cloud on failure.
- The “Engine Status” panel shows availability and basic server diagnostics.

## 9) Troubleshooting

- If you see CORS errors, verify `ALLOW_ORIGINS` in the Space and ensure the protocol/port match your frontend (http/https).
- If you see CUDA OOM errors, use lower resolutions (the frontend defaults to safe mappings in local mode). Cloud mode uses “high” mappings—consider switching to Auto/Local if the Space GPU tier is small.
- If the Space stops responding, restart it from the Space UI.

## 10) Optional: SDXL-Lightning

For even faster 1024px generation:
- Use SDXL-Lightning (ByteDance) with a custom UNet and `EulerDiscreteScheduler` + `timestep_spacing="trailing"`.
- This requires a custom pipeline setup and more VRAM—best suited to Cloud mode with a proper GPU tier.
- You can host a variant on Spaces and point `VITE_CLOUD_ENGINE_URL` to it.