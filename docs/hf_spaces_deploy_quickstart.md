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

## Paso a paso — Windows PowerShell

1) En la raíz del proyecto, inicializa el token en el entorno:
```powershell
$env:HF_TOKEN = "hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

2) Ejecuta el script de despliegue con tu Space ID (ejemplo con ToniBalles73/Anclora):
```powershell
python scripts\hf_space_deploy.py --space-id "ToniBalles73/Anclora" --origins "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8082,http://127.0.0.1:8082"
```
- Alternativa: pasar el token directamente:
```powershell
python scripts\hf_space_deploy.py --space-id "ToniBalles73/Anclora" --token "hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" --origins "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8082,http://127.0.0.1:8082"
```

3) El script:
- Crea/reutiliza el Space (SDK = docker).
- Sube `Dockerfile`, `app.py`, `requirements.txt` y el directorio `backend/`.
- Intenta definir secretos:
  - `ALLOW_ORIGINS` = tus dominios frontend.
  - `HUGGINGFACEHUB_API_TOKEN` = tu token HF (descargas de modelos con licencia).
- Escribe `VITE_CLOUD_ENGINE_URL` en `.env.local`.

4) Ve a tu Space:
- URL: `https://<usuario>-<nombre>.hf.space` (ej.: `https://ToniBalles73-Anclora.hf.space`)
- Espera a que termine el build y el contenedor arranque.

## Paso a paso — Linux/macOS

1) En la raíz del proyecto, exporta el token:
```bash
export HF_TOKEN="hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

2) Ejecuta el script:
```bash
python3 scripts/hf_space_deploy.py --space-id "ToniBalles73/Anclora" --origins "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8082,http://127.0.0.1:8082"
```
- Alternativa:
```bash
python3 scripts/hf_space_deploy.py --space-id "ToniBalles73/Anclora" --token "hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" --origins "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8082,http://127.0.0.1:8082"
```

3) Verifica el Space:
- `https://ToniBalles73-Anclora.hf.space/health`
- Debe devolver JSON con `{ status, device, model, optimizations }`.

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

## Frontend

Tras el despliegue:
- `.env.local` se actualizará automáticamente con:
  - `VITE_CLOUD_ENGINE_URL=https://ToniBalles73-Anclora.hf.space`
- Reinicia el servidor Vite:
  ```bash
  npm run dev
  ```
- En la UI, selecciona:
  - “Cloud” para forzar cloud.
  - “Auto (fallback)” para usar local y caer a cloud si local falla.

## Actualización del Space

Cada vez que cambies el backend:
```bash
python scripts\hf_space_deploy.py --space-id "ToniBalles73/Anclora" --origins "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8082,http://127.0.0.1:8082"
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
- Backend FastAPI: [`backend/app.py`](../backend/app.py)