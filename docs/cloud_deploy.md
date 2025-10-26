# Cloud Deployment Guide (Hugging Face Spaces - FastAPI via Docker)

This guide shows how to deploy the existing FastAPI backend (backend/app.py) to Hugging Face Spaces using the Docker SDK so you can use it as a zero-cost/cloud fallback engine.

## 1) Files already prepared

This repository includes:
- `Dockerfile` (container image definition for Spaces)
- `app.py` (FastAPI entrypoint that imports the app from `backend/app.py`)
- `requirements.txt` (Python dependencies; includes FastAPI + Uvicorn)

You do not need to copy files; the deploy script uploads these to the Space root.

## 2) Create the Space

- Go to https://huggingface.co/spaces
- Click “Create new Space”
- Fill in:
  - Space name: e.g., `your-username/aura-reflect-engine`
  - Visibility: Public (recommended for zero-cost usage)
  - SDK: **Docker**

## 3) Upload files (automated)

- Use the provided script:
  ```
  python scripts/hf_space_deploy.py --space-id <username/space-name> --origins "http://localhost:5173"
  ```
- It uploads:
  - `Dockerfile`
  - `app.py`
  - `requirements.txt`
- It also sets `ALLOW_ORIGINS` as a Space secret (if permitted) and updates `.env.local` with `VITE_CLOUD_ENGINE_URL`.

## 4) Runtime

- Docker Spaces build the image and run the container automatically using:
  ```
  CMD ["python", "app.py"]
  ```
- The server listens on port 7860 (default for Spaces).

## 5) Configure CORS

The backend reads allowed origins from the environment variable `ALLOW_ORIGINS` (comma-separated).
- Example: `ALLOW_ORIGINS=https://your-frontend.example.com,http://localhost:5173`

In Spaces, go to **Settings → Variables** and add:
- `ALLOW_ORIGINS`: your frontend origins (comma-separated)

This will allow your frontend to call the Space API from the browser.

## 6) GPU and performance

- In Spaces **Hardware** tab, select a GPU tier (e.g., T4, A10G) to enable CUDA acceleration. Free tiers may have limitations.
- Recommended environment variables for faster generation:
  - `SD_MODEL_ID`: base model suited to your deployment
    - LCM-LoRA at few steps: `runwayml/stable-diffusion-v1-5`
    - SDXL: `stabilityai/stable-diffusion-xl-base-1.0`
  - `SD_LCM_LORA_ID`: e.g., `latent-consistency/lcm-lora-sdv1-5` (or `latent-consistency/lcm-lora-sdxl`)
  - `SD_PRECISION`: `fp16` (on GPU) or `auto`
  - `SD_DEVICE`: `cuda` (Spaces GPU)
  - Optional: `TORCH_COMPILE=1` (PyTorch 2+) for small speedups
- You can set environment variables in **Settings → Variables**.

## 7) API endpoints

Once the Space is running, it exposes:
- POST `/generate`
  - JSON: `{ "prompt": string, "aspectRatio": string, "temperature": number, "resolution": "high"|"standard" }`
  - Returns: `{ "images": [ "<base64>", ... ] }`
- POST `/refine`
  - JSON: `{ "refinePrompt": string, "images": [ "<base64>", ... ], "config"?: { "steps"?: number, "guidanceScale"?: number } }`
  - Returns: `{ "images": [ "<base64>", ... ] }`
- GET `/health`
  - Returns basic diagnostics (device, model, scheduler, optimizations)

Note:
- The frontend (this repo) supports selecting “Cloud” mode and sends `resolution: "high"` only when the Space reports a GPU; otherwise it uses `resolution: "standard"`.

## 8) Configure the frontend

In your frontend `.env.local` (automatically updated by the script):
- `VITE_CLOUD_ENGINE_URL=https://your-username-aura-reflect-engine.hf.space`
- Ensure your frontend origin is allowed by the Space via `ALLOW_ORIGINS`.

With the UI:
- Use “Cloud” mode to force cloud engine.
- Use “Auto (fallback)” mode to prefer local and fallback to cloud on failure.
- The “Engine Status” panel shows availability and basic server diagnostics.

## 9) Troubleshooting

- If you see CORS errors, verify `ALLOW_ORIGINS` in the Space and ensure the protocol/port match your frontend (http/https).
- If you see CUDA OOM errors, use lower resolutions (the frontend defaults to safe mappings in local mode). Cloud mode uses “high” mappings only when GPU is detected—otherwise it stays at “standard”.
- If the Space stops responding, restart it from the Space UI.

## 10) Optional: SDXL-Lightning

For extremely fast 1024px generation:
- Use SDXL-Lightning with `EulerDiscreteScheduler` + `timestep_spacing="trailing"`.
- Requires custom pipeline and more VRAM—best suited to Cloud mode with a proper GPU tier.
- You can host a variant on Spaces and point `VITE_CLOUD_ENGINE_URL` to it.