# Backend Design for Local Image Generation Service

## Overview
This document outlines a Node.js + Express backend that brokers requests between the Aura Reflect frontend and a locally hosted image generation model. The backend exposes two RESTful endpoints—`POST /generate` and `POST /refine`—that mirror the existing frontend service contracts while handling model execution, binary streaming, and operational concerns such as CORS and error propagation.

## Configuration & Environment Variables

The backend expects configuration through environment variables loaded via `dotenv`. Copy `.env.example` to `.env` and supply at least the following values:

| Variable | Description |
| -------- | ----------- |
| `IMAGE_SERVICE_BASE_URL` | Base URL exposed to the frontend (defaults to `http://localhost:4000`). |
| `MODEL_CHECKPOINT_DIR` | Local path to the Stable Diffusion XL base checkpoint. |
| `MODEL_REFINER_CHECKPOINT_DIR` | Path to the refiner checkpoint used for high-quality outputs. |
| `MODEL_DEVICE` | Target device (`cuda`, `cuda:0`, `mps`, `cpu`). |
| `MODEL_PRECISION` | Floating-point precision for inference (`fp32`, `fp16`, `bf16`). |
| `ENABLE_XFORMERS` | Toggle for memory-saving attention kernels. |
| `MODEL_MAX_BATCH_SIZE` | Maximum number of images to generate per request. |
| `BACKEND_PORT` | Port used by the Express server (default `4000`). |

Refer to [`docs/local_service_setup.md`](local_service_setup.md) for practical instructions on populating these variables and exporting them in development.

## Hardware Requirements

Running Stable Diffusion XL locally generally requires a GPU with **12 GB VRAM** for the base model and **16 GB+** if you plan to use the refiner or larger batch sizes. Development on CPU is possible but incurs substantial latency. Detailed sizing guidance and mitigation strategies (FP16, xFormers, batch tuning) are documented in [`docs/local_service_setup.md`](local_service_setup.md#requisitos-de-hardware).

## Model Acquisition & Licensing

Download the SDXL checkpoints from Hugging Face after accepting the [CreativeML Open RAIL++-M](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/blob/main/README.md#license) terms. The `LocalModelClient` should validate the existence of the paths provided via `MODEL_CHECKPOINT_DIR` and optionally `MODEL_REFINER_CHECKPOINT_DIR`, raising descriptive errors if the files are missing. See [`docs/local_service_setup.md`](local_service_setup.md#descarga-de-checkpoints) for CLI commands.

## Architecture
- **Runtime**: Node.js 20 with TypeScript for type parity with the frontend.
- **Framework**: Express.js with `express-async-errors` for promise-aware middleware.
- **Model integration**: Pluggable `LocalModelClient` abstraction that wraps the local inference executable, Python service, or library bindings.
- **Image storage**: All image data remains in-memory; responses are encoded as Data URIs to keep the frontend unchanged.
- **Streaming**: Generated binary chunks are streamed from the model into base64 encoders to avoid buffering large files in memory when possible.

### High-level modules
| Module | Responsibility |
| ------ | -------------- |
| `server.ts` | Bootstraps Express, applies middleware, and registers routes. |
| `routes/imageRoutes.ts` | Defines `/generate` and `/refine` endpoints. |
| `controllers/imageController.ts` | Maps HTTP requests to service calls and shapes responses. |
| `services/imageService.ts` | Orchestrates prompt handling, model invocation, and output encoding. |
| `clients/localModelClient.ts` | Encapsulates low-level interaction with the local model runtime. |
| `middleware/errorHandler.ts` | Normalizes thrown errors into HTTP responses. |
| `middleware/cors.ts` | Centralizes CORS policy configuration. |

## API Contracts
The contracts mirror `generateInitialImages` and `refineImages` defined in [`services/geminiService.ts`](../services/geminiService.ts). All responses include images as `data:image/png;base64,...` Data URIs so the frontend can render them directly without additional transforms.

### `POST /generate`
- **Description**: Produces two initial candidate images from a natural language mood prompt.
- **Request body**
  ```json
  {
    "prompt": "String, required",
    "aspectRatio": "String, optional, defaults to 'Auto'",
    "temperature": "Number, optional, defaults to 0.8"
  }
  ```
- **Response (201)**
  ```json
  {
    "images": [
      "data:image/png;base64,iVBORw0KGgo...",
      "data:image/png;base64,iVBORw0KGgo..."
    ],
    "meta": {
      "model": "local-imagen",
      "durationMs": 1234
    }
  }
  ```
- **Error responses**
  - `400 Bad Request`: missing or invalid fields.
  - `422 Unprocessable Entity`: prompt rejected by safety filters.
  - `500 Internal Server Error`: unexpected model or infrastructure failures.

### `POST /refine`
- **Description**: Generates two new images that refine previously generated candidates.
- **Request body**
  ```json
  {
    "baseImages": [
      "data:image/png;base64,iVBORw0KGgo..."
    ],
    "refinePrompt": "String, required"
  }
  ```
- **Response (201)**
  ```json
  {
    "images": [
      "data:image/png;base64,iVBORw0KGgo...",
      "data:image/png;base64,iVBORw0KGgo..."
    ],
    "meta": {
      "model": "local-imagen",
      "durationMs": 1560
    }
  }
  ```
- **Error responses**
  - `400 Bad Request`: empty `baseImages` array or malformed Data URIs.
  - `413 Payload Too Large`: body exceeds configured limits (protects against oversized images).
  - `500 Internal Server Error`: downstream failures.

### Shared response shape
All responses share the top-level keys:
- `images`: array of Data URIs (length 2 by default).
- `meta`: optional metadata block (model identifier, timing, warnings, etc.).

### Validation summary
| Field | Rules |
| ----- | ----- |
| `prompt` | Trimmed string, 1–500 chars. |
| `aspectRatio` | Enum: `"Auto"`, `"1:1"`, `"3:2"`, `"16:9"`, etc.; validated against supported set. |
| `temperature` | Float between 0 and 2, default 0.8. |
| `baseImages` | Non-empty array of `data:image/<subtype>;base64,` strings; verify base64 payload decodes. |
| `refinePrompt` | Trimmed string, 1–500 chars. |

## CORS Strategy
- Use the `cors` package with explicit allow-list derived from environment variables, e.g., `ALLOWED_ORIGINS=https://aura-reflect.app`.
- Support credentials only if required; otherwise disable to simplify preflight responses.
- Cache preflight responses for 10 minutes with `Access-Control-Max-Age`.
- Deny all other origins by returning a 403 with a structured JSON error payload.

## Error Handling Plan
1. **Input validation** via `zod` schemas with a custom error formatter returning `{ "error": { "code": "VALIDATION_ERROR", "details": [...] } }` and HTTP 400.
2. **Model invocation errors** bubble up as `ModelError` instances containing a machine-readable `reason` (`"SAFETY_BLOCK"`, `"TIMEOUT"`, etc.) translated into 4xx/5xx responses.
3. **Unknown errors** fall back to a sanitized 500 response while logging full stack traces with `pino`.
4. **Request logging** includes a correlation ID header (`x-request-id`) propagated through logs for debugging.

## Binary Streaming & Encoding Workflow
1. The `LocalModelClient` exposes an async iterator that yields PNG byte chunks as soon as they are produced by the model.
2. `imageService` pipes these chunks into a `Base64Encode` stream, accumulating minimal state.
3. Once generation completes, the encoded payload is wrapped in the `data:image/png;base64,` prefix.
4. The controller pushes each completed Data URI into the response array; if the model supports parallel generation, each stream is processed independently to maximize throughput.
5. Failures mid-stream trigger cancellation of outstanding model jobs, ensuring partial images are not returned.

## Security & Operational Considerations
- **Rate limiting**: apply a token-bucket middleware (e.g., `rate-limiter-flexible`) with environment-configurable limits.
- **Timeouts**: enforce request-level timeouts (e.g., 60s) using `AbortController` to cancel slow model invocations.
- **Health check**: expose `GET /health` returning model availability and version info.
- **Configuration**: use `dotenv` with typed configuration objects to avoid missing env vars.
- **Testing**: add integration tests with supertest mocking the `LocalModelClient` to validate contracts and error cases.

## Deployment Notes
- Package as a Docker image that bundles the Node app and mounts the local model runtime via volume or sidecar.
- For development, provide an `.env.example` and a `docker-compose.dev.yml` that launches the backend alongside the local model.
- Include scripts:
  - `npm run dev` – watch mode with `ts-node-dev`.
  - `npm run build` – TypeScript compilation.
  - `npm run start` – production server via `node dist/server.js`.

