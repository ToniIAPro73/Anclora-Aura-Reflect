# Repository Guidelines

## Project Structure & Module Organization
- `App.tsx` wires global state, routing, and layout. Keep shared UI atoms in `components/` (PascalCase files exporting one component each) and isolate data-fetching hooks under `services/`. Frontend-only utilities live in `scripts/` and root-level `constants.ts` / `types.ts`.
- Python AI workers sit in `backend/app.py`; start them before the React client. Heavy model notes and troubleshooting live in `docs/local_service_setup.md` and `docs/backend_design.md`.
- The legacy Node service under `server/` remains in maintenance mode. Only touch it when coordinating with `server/controllers/*` counterparts.
- UI-facing tests live in `__tests__/` alongside component mocks. Snapshot fixtures stay inside `__tests__/fixtures` if you need new ones.

## Build, Test, and Development Commands
- `npm install` — bootstrap the React workspace.
- `npm run dev` — start Vite with hot reload on http://localhost:5173.
- `npm run build` / `npm run preview` — generate and smoke-test the production bundle.
- `npx vitest` or `npx vitest run` — execute the Vitest suite in watch or CI mode.
- `cd backend && pip install -r requirements.txt` then `python app.py` — run the FastAPI server at http://localhost:8000.
- `bash scripts/download-models.sh --target ./weights` — pull diffusers assets before first boot (WSL/Git Bash recommended on Windows).

## Coding Style & Naming Conventions
- TypeScript + React 19 with functional components only; prefer hooks over legacy lifecycle APIs. Stick to 2-space indentation and trailing commas (Prettier defaults). Alias imports with `@/` instead of deep relative paths.
- Components and hooks use `PascalCase`, utilities use `camelCase`, and constants stay in `SCREAMING_SNAKE_CASE`. Keep props typed explicitly and narrow `any` usage.
- For Python, follow Black-like formatting (88 char lines) and FastAPI dependency injection patterns. Node helpers under `server/` should observe CommonJS module exports.

## Testing Guidelines
- Write Vitest specs in `__tests__/*.{test,spec}.tsx`. Mirror component names (e.g., `PromptForm.test.tsx`) and group scenarios with Testing Library screen queries.
- Mock backend calls via `vi.mock("@/services/...")`; avoid network calls in unit tests.
- Target high-value pathways: prompt validation, gallery rendering, and error states. Keep current coverage steady (~70% lines) until we set a formal threshold.

## Commit & Pull Request Guidelines
- Follow the concise, action-first style used in history (`corrección error`, `nuevas modificaciones`). Prefer Spanish imperatives plus an optional scope tag (e.g., `fix: ajustar PromptForm`).
- Reference tickets in the body (`Refs #123`) and describe backend/frontend touchpoints separately. Attach screenshots or curl outputs when UI or API behavior changes.
- PRs must include: purpose summary, manual test checklist (backend + frontend), and any model download steps that reviewers must repeat.

## Model & Environment Notes
- Copy `.env.example` to `.env.local` and keep secrets out of version control. Sync backend tokens via `.env.local` additions rather than editing `.env.local.example`.
- GPU acceleration is optional but recommended; document whether you tested with `cuda` or CPU fallbacks in PR notes so reviewers can reproduce.
