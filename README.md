<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Moodboard Generator

A React-based moodboard generator using local AI models for text-to-image and image-to-text.

## Requisitos previos

**Prerequisites:** Node.js, Python 3.8+

### Backend Setup (Python)

1. Navigate to the backend directory:
   `cd backend`
2. Install Python dependencies:
   `pip install -r requirements.txt`
3. Run the backend server:
   `python app.py`
   The server will run on http://localhost:8000

### Frontend Setup (React)

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`
   The app will run on http://localhost:5173

Note: Ensure the backend is running before using the app, as it relies on local AI models.

---

## Despliegue a Hugging Face Spaces (Cloud Engine)

El proyecto incluye un script de despliegue para crear/reutilizar un Space (SDK Docker), subir el backend (FastAPI) y configurar el frontend para usar el motor de nube.

### 1) Variables necesarias

- Token HF (escritura): `HF_TOKEN`
- ID del Space: `SPACE_ID` (ej. `ToniBalles73/Anclora`)
- Orígenes frontend (CORS): `ORIGINS` (ej. `http://localhost:5173,http://127.0.0.1:5173`)

### 2) Ejecutar desde npm

Windows (PowerShell):
```powershell
$env:HF_TOKEN="hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
$env:SPACE_ID="ToniBalles73/Anclora"
$env:ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://localhost:8082,http://127.0.0.1:8082"
npm run deploy:space:win
```

Linux/macOS:
```bash
export HF_TOKEN="hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
export SPACE_ID="ToniBalles73/Anclora"
export ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://localhost:8082,http://127.0.0.1:8082"
npm run deploy:space:unix
```

El script:
- Crea/reutiliza el Space (SDK=docker)
- Sube Dockerfile, app.py, requirements.txt y `backend/`
- Intenta fijar secretos: `ALLOW_ORIGINS`, `HUGGINGFACEHUB_API_TOKEN`
- Actualiza `.env.local` con `VITE_CLOUD_ENGINE_URL`

### 3) Verificar

- URL del Space: `https://<usuario>-<space>.hf.space` (ej. `https://ToniBalles73-Anclora.hf.space`)
- Abre `/health` para comprobar el estado.
- Reinicia el frontend para aplicar `.env.local`.
- En la UI, usa “Cloud” o “Auto (fallback)” en el selector de motor.

Más detalles:
- Consulta `docs/hf_spaces_deploy_quickstart.md` y `docs/cloud_deploy.md`.
