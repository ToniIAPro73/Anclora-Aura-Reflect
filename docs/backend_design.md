# Backend Design for Local Image Generation Service

## Overview
This document outlines a Node.js + Express backend that brokers requests between the Aura Reflect frontend and a locally hosted image generation model. The backend exposes two RESTful endpoints—`POST /generate` and `POST /refine`—that mirror the existing frontend service contracts while handling model execution, binary streaming, and operational concerns such as CORS and error propagation.

## Architecture
- **Runtime**: Node.js 20 with TypeScript for type parity with the frontend.
- **Framework**: Express.js with `express-async-errors` for promise-aware middleware.
- **Model integration**: Pluggable `LocalModelClient` abstraction that wraps the local inference executable, Python service, or library bindings.
- **Image storage**: All image data remains in-memory; responses return base64 strings that the frontend wraps in Data URIs to keep rendering logic unchanged.
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
The contracts mirror `generateInitialImages` and `refineImages` defined in [`services/geminiService.ts`](../services/geminiService.ts). Request payloads accept the same shapes produced by the React components, and responses return raw base64 strings so the existing helpers can continue to prepend the `data:image/png;base64,` prefix on the client.

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
- **JSON Schema**
  ```json
  {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": ["prompt"],
    "additionalProperties": false,
    "properties": {
      "prompt": { "type": "string", "minLength": 1, "maxLength": 500 },
      "aspectRatio": {
        "type": "string",
        "enum": ["Auto", "1:1", "3:2", "16:9", "9:16", "4:5"],
        "default": "Auto"
      },
      "temperature": {
        "type": "number",
        "minimum": 0,
        "maximum": 2,
        "default": 0.8
      }
    }
  }
  ```
- **Response (201)**
  ```json
  {
    "images": [
      "iVBORw0KGgo...",
      "iVBORw0KGgo..."
    ],
    "meta": {
      "model": "local-imagen",
      "durationMs": 1234
    }
  }
  ```
- **Response schema**
  ```json
  {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": ["images"],
    "additionalProperties": false,
    "properties": {
      "images": {
        "type": "array",
        "minItems": 1,
        "items": {
          "type": "string",
          "description": "PNG payload encoded as base64 without the data URI prefix"
        }
      },
      "meta": {
        "type": "object",
        "additionalProperties": true,
        "properties": {
          "model": { "type": "string" },
          "durationMs": { "type": "integer", "minimum": 0 }
        }
      }
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
- **JSON Schema**
  ```json
  {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": ["baseImages", "refinePrompt"],
    "additionalProperties": false,
    "properties": {
      "baseImages": {
        "type": "array",
        "minItems": 1,
        "items": {
          "type": "string",
          "pattern": "^data:image\\/(png|jpeg);base64,",
          "description": "Full data URI as emitted by the frontend image grid"
        }
      },
      "refinePrompt": { "type": "string", "minLength": 1, "maxLength": 500 }
    }
  }
  ```
- **Response (201)**
  ```json
  {
    "images": [
      "iVBORw0KGgo...",
      "iVBORw0KGgo..."
    ],
    "meta": {
      "model": "local-imagen",
      "durationMs": 1560
    }
  }
  ```
- **Response schema**
  ```json
  {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "required": ["images"],
    "additionalProperties": false,
    "properties": {
      "images": {
        "type": "array",
        "minItems": 1,
        "items": {
          "type": "string",
          "description": "PNG payload encoded as base64 without the data URI prefix"
        }
      },
      "meta": {
        "type": "object",
        "additionalProperties": true,
        "properties": {
          "model": { "type": "string" },
          "durationMs": { "type": "integer", "minimum": 0 }
        }
      }
    }
  }
  ```
- **Error responses**
  - `400 Bad Request`: empty `baseImages` array or malformed Data URIs.
  - `413 Payload Too Large`: body exceeds configured limits (protects against oversized images).
  - `500 Internal Server Error`: downstream failures.

### Shared response shape
All responses share the top-level keys:
- `images`: array of base64-encoded PNG payloads (length 2 by default). The frontend wraps each string with the `data:image/png;base64,` prefix, matching the expectations of `generateInitialImages` and `refineImages` in [`services/geminiService.ts`](../services/geminiService.ts).
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
- Always include the local Vite origin (`http://localhost:${process.env.VITE_PORT ?? 5173}`) so that the SPA can communicate with the backend during development.
- Support credentials only if required; otherwise disable to simplify preflight responses.
- Cache preflight responses for 10 minutes with `Access-Control-Max-Age`.
- Deny all other origins by returning a 403 with a structured JSON error payload.

```ts
// middleware/cors.ts
import cors from "cors";

const vitePort = process.env.VITE_PORT ?? "5173";
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
);

allowedOrigins.add(`http://localhost:${vitePort}`);

export const corsMiddleware = cors({
  origin: Array.from(allowedOrigins),
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 600,
});
```

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

## Environment configuration
Centralize configuration in a strongly-typed module (e.g., `config/env.ts`) that reads from environment variables, validates them with `zod`, and exports a single immutable object.

| Variable | Required | Default | Purpose |
| -------- | -------- | ------- | ------- |
| `PORT` | No | `8787` | HTTP port for the Express server. |
| `ALLOWED_ORIGINS` | No | `""` | Comma-separated allow-list of production origins for CORS. |
| `VITE_PORT` | No | `5173` | Ensures the development SPA origin is whitelisted for CORS. |
| `VITE_API_BASE_URL` | Yes (frontend) | — | Injected into the SPA; points fetch calls at the local backend. |
| `GENERATION_MODEL` | No | `imagen-4.0-generate-001` | Overrides the model used for initial image generation. |
| `REFINE_MODEL` | No | `gemini-2.5-flash-image` | Overrides the model used for refinement calls. |
| `IMAGE_COUNT` | No | `2` | Controls the number of images generated per request. |
- **Testing**: add integration tests with supertest mocking the `LocalModelClient` to validate contracts and error cases.

## Deployment Notes
- Package as a Docker image that bundles the Node app and mounts the local model runtime via volume or sidecar.
- For development, provide an `.env.example` and a `docker-compose.dev.yml` that launches the backend alongside the local model.
- Include scripts:
  - `npm run dev` – watch mode with `ts-node-dev`.
  - `npm run build` – TypeScript compilation.
  - `npm run start` – production server via `node dist/server.js`.

