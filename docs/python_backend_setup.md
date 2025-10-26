# Configuración del backend Python (FastAPI) en local

Esta guía te permite arrancar el backend de Aura Reflect escrito en Python/FastAPI (`backend/app.py`) de forma fiable en tu máquina, corregir los avisos de Pylance y ejecutar el servicio con dependencias instaladas.

## Requisitos

- Python 3.10 (recomendado)
- VS Code con las extensiones:
  - Microsoft Python
  - Pylance
- (Opcional) CUDA si usarás GPU
- (Opcional) Token de Hugging Face con licencias aceptadas para los modelos

## 1) Crear un entorno virtual (venv)

Linux/macOS:
```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
```

Windows (PowerShell):
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

## 2) Instalar dependencias

Usa el archivo de requisitos del backend:
```bash
pip install -r backend/requirements.txt
```

Esto instala: fastapi, uvicorn, torch, diffusers, transformers, pillow, numpy, accelerate, safetensors, pydantic.

Notas:
- Para GPU con CUDA, instala la rueda de torch adecuada (ejemplo para CUDA 12.1):
  ```bash
  pip install --upgrade torch --index-url https://download.pytorch.org/whl/cu121
  ```
- xFormers es opcional y no está en requirements; solo instálalo si tu GPU lo soporta.

## 3) Seleccionar intérprete en VS Code

- Abre el proyecto en VS Code.
- Ctrl+Shift+P → “Python: Select Interpreter” → elige `.venv` recién creado.
- Pylance dejará de marcar “reportMissingImports” si el intérprete tiene las librerías instaladas.
- En `backend/app.py` añadimos `# pyright: reportMissingImports=false` y `# type: ignore` en imports externos para suprimir falsos positivos en análisis estático. Aun así, asegúrate de que tu intérprete venv está seleccionado.

## 4) Variables de entorno recomendadas

Crea `.env.local` (ya añadimos uno en el repo) o exporta las variables en tu entorno:

- CORS (frontend dev):
  - `ALLOW_ORIGINS=http://localhost:5173,http://127.0.0.1:5173`

- Rendimiento / modelos (ajústalas según hardware):
  - `SD_MODEL_ID=runwayml/stable-diffusion-v1-5`  (recomendado para CPU/GPU general)
  - `SD_LCM_LORA_ID=latent-consistency/lcm-lora-sdv1-5` (opcional, acelera con pocos pasos)
  - `SD_PRECISION=auto` (FP16 en CUDA/MPS, FP32 en CPU)
  - `SD_DEVICE=auto` (elige cuda/mps/cpu automáticamente)
  - `SD_STEPS=6` (rápido con LCM; sube si prefieres calidad)
  - `SD_GUIDANCE=1.0` (rápido con LCM; ajusta según estilo)
  - `TORCH_COMPILE=1` (opcional, PyTorch 2+)

- Hugging Face (modelos con licencia/gate):
  - `HUGGINGFACEHUB_API_TOKEN=<tu_token>` (asegúrate de haber aceptado la licencia del modelo elegido en la web de HF)

## 5) Arrancar el backend FastAPI

Con el venv activado:
```bash
uvicorn backend.app:app --host 0.0.0.0 --port 8000
```

Endpoints:
- GET `/`        → estado y endpoints disponibles
- GET `/health`  → dispositivo, modelo y optimizaciones
- POST `/generate` → { prompt, aspectRatio, temperature, resolution? }
- POST `/refine`   → { images: [base64], refinePrompt }

Si ves errores de descarga de modelos:
- Acepta la licencia del modelo en Hugging Face (p. ej. CompVis/SD v1-4).
- Usa un modelo no gateado o recomendado (runwayml/stable-diffusion-v1-5).
- Verifica que el token está activo en el entorno (y que la variable está bien escrita).

## 6) Frontend

El frontend usa las variables:
- `VITE_LOCAL_ENGINE_URL=http://localhost:8000`
- `VITE_CLOUD_ENGINE_URL=https://<tu-space>.hf.space` (si usas modo nube)

Reinicia el servidor Vite tras cualquier cambio en `.env.local`:
```bash
npm run dev
```
Selecciona “Cloud” o “Auto (fallback)” en el selector del motor (UI).

## 7) Solución de problemas

- “Import ... could not be resolved” en VS Code:
  - Instala las librerías en el venv.
  - Selecciona el intérprete del venv en VS Code.
  - Los `# type: ignore` añadidos evitan falsos positivos de Pylance, pero no sustituyen a una instalación correcta.

- “CUDA out of memory”:
  - Baja resolución (el backend ya usa mapeos seguros).
  - Reduce `SD_STEPS`.
  - Activa LCM-LoRA si la calidad lo permite.

- Error 403 al descargar checkpoints:
  - Licencia no aceptada en Hugging Face o token inválido.

## 8) Dev Container (opcional)

Este repo incluye `.devcontainer/devcontainer.json` con Python 3.10 y Node.js 20.
- Instala automáticamente `backend/requirements.txt` al crear el contenedor.
- Forwardea puertos 8000 (backend) y 5173 (frontend).
- Extensiones y ajustes de VS Code preconfigurados para Python/Pylance.

Uso:
1. Instala la extensión “Dev Containers” en VS Code.
2. Ctrl+Shift+P → “Dev Containers: Reopen in Container”.
3. Arranca el backend con uvicorn y el frontend con `npm run dev`.