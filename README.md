<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Aura Reflect – Local Development Guide

This repository contains the React frontend for Aura Reflect along with documentation for the companion backend described in [`
docs/backend_design.md`](./docs/backend_design.md).

View the original AI Studio app: https://ai.studio/apps/drive/1bgjlqJ61J71FTs1FPg91aH7pvte4oNb3

## Prerequisites & Hardware

| Requirement | Recommended Version / Notes |
|-------------|-----------------------------|
| Node.js     | v20.x (LTS). Earlier versions may not support the Vite configuration. |
| npm         | v10.x (bundled with Node 20). |
| GPU         | Optional but recommended when running a local diffusion/Imagen-compatible backend. An NVIDIA GPU with ≥8 GB VRAM or equivalent is sufficient for the sample workflows. |
| System RAM  | ≥16 GB to comfortably run the frontend, backend, and local model runtimes. |

## Environment Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.local.example` (or create `.env.local`) and set the following variables:
   ```bash
   GEMINI_API_KEY=your_gemini_key # Used when pointing at the hosted Gemini APIs
   VITE_BACKEND_URL=http://localhost:5050 # Optional: URL for the local backend proxy
   ```
3. If you are running the local backend, follow the steps in [Backend Setup](#backend-setup).

## Frontend Development

```bash
npm run dev
```

The Vite dev server boots on `http://localhost:8080` (configurable via `vite.config.ts`).

### Contract Testing

Vitest and Testing Library are configured to mock backend responses:

```bash
npm test
```

Tests cover successful and failing flows for both generation and refinement to guarantee the UI handles backend responses and e
rrors consistently.

## Backend Setup

The backend contract is documented in [`docs/backend_design.md`](./docs/backend_design.md). A reference implementation should e
xpose `POST /generate` and `POST /refine` endpoints that mirror the types expected by the frontend service layer.

1. Clone or scaffold the backend using the modules outlined in the design document.
2. Install dependencies and create a `.env` file with your model/runtime configuration.
3. Start the backend on `http://localhost:5050` (or update `VITE_BACKEND_URL` to match your port).
4. Ensure CORS allows the frontend origin (defaults to `http://localhost:8080`).

## Manual Testing Matrix

Manual verification notes for prompts, aspect ratios, temperatures, and refinement flows are tracked in [`docs/manual-testing.md`](./docs/manual-testing.md).

## Troubleshooting

- **`API_KEY environment variable not set`** – Ensure `GEMINI_API_KEY` (or `API_KEY`) is defined before running the dev server or vitest. When using the local backend exclusively, stub the Gemini service via environment variables or mocks.
- **Frontend cannot reach backend (`Failed to fetch`)** – Confirm the backend is running on the port referenced by `VITE_BACKEND_URL` and that CORS is configured to allow the frontend origin.
- **Out-of-memory errors during model runs** – Lower the requested image resolution/number of images in the backend config or run against a machine with more GPU VRAM/RAM.
- **Port already in use** – Update the `server.port` field in `vite.config.ts` or stop the conflicting service.

## Additional Resources

- [`docs/backend_design.md`](./docs/backend_design.md) – REST contract and architecture overview for the Node.js backend.
- [`docs/manual-testing.md`](./docs/manual-testing.md) – Latest manual QA log covering generation and refinement behaviours.
