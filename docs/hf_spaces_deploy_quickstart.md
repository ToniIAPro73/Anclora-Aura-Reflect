# Despliegue rápido a Hugging Face Spaces (Docker + FastAPI)

Esta guía explica cómo desplegar el backend de Aura Reflect (FastAPI) a Hugging Face Spaces usando el SDK de Docker. Está pensada para ejecutarse desde tu entorno local o el Dev Container de VS Code.

El proceso:
- Usa `Dockerfile`, `app.py`, `backend/` y `requirements.txt` del repo.
- Emplea el script `scripts/hf_space_deploy.py` para crear/reutilizar el Space y subir los archivos.
- Configura secretos/variables del Space (`ALLOW_ORIGINS`, `HUGGINGFACEHUB_API_TOKEN`).
- Actualiza tu `.env.local` con `VITE_CLOUD_ENGINE_URL` apuntando al Space.

## Requisitos

- Cuenta en Hugging Face.
- Token de escritura (HF) con permisos válidos:
  - https://huggingface.co/settings/tokens
- Python y `huggingface-hub` instalados:
  ```bash
  python -m pip install huggingface-hub
  ```
- Orígenes de tu frontend (CORS), p. ej.:
  - `http://localhost:5173,http://127.0.0.1:5173,http://localhost:8082,http://127.0.0.1:8082`

## Comando único (npm), lecturas de .env y autoderivación

Puedes desplegar con un único comando multiplataforma que lee variables desde `.env.local` y `.env` automáticamente:

```bash
# Windows (PowerShell)
$env:HF_TOKEN="hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
# opcional si ya tienes VITE_CLOUD_ENGINE_URL en .env.local:
$env:SPACE_ID="ToniBalles73/Anclora"
# ORIGINS es opcional: si no lo defines, se derivará de vite.config.ts (server.port) y se añadirán defaults.
npm run deploy:space

# Linux/macOS
export HF_TOKEN="hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
# opcional si ya tienes VITE_CLOUD_ENGINE_URL en .env.local:
export SPACE_ID="ToniBalles73/Anclora"
# ORIGINS es opcional: si no lo defines, se derivará de vite.config.ts (server.port) y se añadirán defaults.
npm run deploy:space
```

El script `scripts/deploy_space.mjs`:
- Carga `.env.local` y `.env`.
- Deriva `SPACE_ID` de `VITE_CLOUD_ENGINE_URL` si no está definido (ej. `https://ToniBalles73-Anclora.hf.space` → `ToniBalles73/Anclora`).
- Deriva `ORIGINS` automáticamente leyendo el puerto del dev server en `vite.config.ts` (`server.port`) y siempre añade los puertos comunes de Vite (5173), formando:
  - `http://localhost:<puerto>, http://127.0.0.1:<puerto>, http://localhost:5173, http://127.0.0.1:5173`
- Llama a `scripts/hf_space_deploy.py` con esos parámetros.

Comandos específicos por sistema (si prefieres):
- `npm run deploy:space:win`
- `npm run deploy:space:unix`

## Verificar

- URL del Space: `https://<usuario>-<space>.hf.space` (ej. `https://ToniBalles73-Anclora.hf.space`)
- Abre `/health` para comprobar el estado.
- Reinicia el frontend para aplicar `.env.local`.
- En la UI, usa “Cloud” o “Auto (fallback)” en el selector de motor.

## Variables y rendimiento (en el Space)

En Settings → Variables/Secrets:
- CORS:
  - `ALLOW_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:8082,http://127.0.0.1:8082`
- Token para modelos con licencia:
  - `HUGGINGFACEHUB_API_TOKEN=<tu_token>`
- Opcionales de rendimiento:
  - `SD_MODEL_ID=runwayml/stable-diffusion-v1-5`
  - `SD_LCM_LORA_ID=latent-consistency/lcm-lora-sdv1-5`
  - `SD_PRECISION=auto`
  - `SD_DEVICE=auto`
  - `SD_STEPS=6`
  - `SD_GUIDANCE=1.0`
  - `TORCH_COMPILE=1`

Hardware (Settings → Hardware):
- CPU (gratis): funciona; el frontend enviará `resolution="standard"`.
- GPU (de pago): activa CUDA; el frontend enviará `resolution="high"` (1024-wide).

## Actualización del Space

Cada vez que cambies el backend:
```bash
npm run deploy:space
```
- El Space reconstruirá la imagen y aplicará cambios.

## Solución de problemas

- 404 Not Found en `/`:
  - Asegúrate de que el backend define una ruta raíz (este repo ya la incluye).
- Permisos de caché (HF/Transformers/Torch):
  - El `Dockerfile` configura caches en `/tmp` (writable). Si ves errores, fuerza variables de cache en el Space.
- Error de licencia/modelo (403/401):
  - Acepta los términos del modelo en Hugging Face.
  - Define `HUGGINGFACEHUB_API_TOKEN` en Secrets.
  - Cambia `SD_MODEL_ID` a uno no gateado (ej. `runwayml/stable-diffusion-v1-5`).
- CORS:
  - Comprueba la variable `ALLOW_ORIGINS` en el Space y que el protocolo/puerto coincidan (http/https).
- Builds lentos:
  - Espera a que el Space complete el build; revisa “Runtime logs”.

## Referencias

- Guía Docker + FastAPI: [`docs/cloud_deploy.md`](./cloud_deploy.md)
- Script de despliegue: [`scripts/hf_space_deploy.py`](../scripts/hf_space_deploy.py)
- Comando npm unificado: [`scripts/deploy_space.mjs`](../scripts/deploy_space.mjs)
- Backend FastAPI: [`backend/app.py`](../backend/app.py)