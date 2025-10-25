<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1bgjlqJ61J71FTs1FPg91aH7pvte4oNb3

## Run Locally

**Prerequisites:** Node.js 20+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create an `.env.local` file and define the required environment variables:
   ```bash
   GEMINI_API_KEY="<your Google AI Studio key>"
   VITE_API_BASE_URL="http://localhost:8787"   # Backend base URL used by fetch calls
   VITE_GENERATE_MODEL="imagen-4.0-generate-001" # Optional: override the generation model ID
   VITE_REFINE_MODEL="gemini-2.5-flash-image"   # Optional: override the refinement model ID
   ```
   `VITE_API_BASE_URL` should point to the backend described in [`docs/backend_design.md`](docs/backend_design.md). Leaving it empty makes the frontend fall back to the hosted Gemini APIs in `services/geminiService.ts`.
3. Launch the development server (defaults to [http://localhost:5173](http://localhost:5173)):
   ```bash
   npm run dev
   ```

### Additional scripts
- `npm run build` – generate an optimized production bundle.
- `npm run preview` – serve the production bundle locally for smoke testing.
