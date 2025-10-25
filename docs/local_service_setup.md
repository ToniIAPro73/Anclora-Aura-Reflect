# Guía para el servicio local de generación de imágenes

Esta guía resume los pasos necesarios para ejecutar Aura Reflect completamente en local utilizando un backend propio basado en Stable Diffusion XL. Complementa la arquitectura descrita en [`docs/backend_design.md`](backend_design.md) y amplía la información del archivo `.env.example`.

## Requisitos de hardware

| Perfil | VRAM mínima | VRAM recomendada | Notas |
| ------ | ----------- | ---------------- | ----- |
| Desarrollo básico | 12 GB | 16 GB | Permite ejecutar el modelo base en FP16 con lotes de 1-2 imágenes. |
| Producción ligera | 16 GB | 24 GB | Facilita el uso del refiner y lotes mayores. |
| CPU / GPU Apple | N/A | 16 GB RAM unificada | Solo viable con `MODEL_DEVICE=cpu` o `MODEL_DEVICE=mps`; la latencia es significativamente mayor. |

> Consejo: si tu GPU tiene menos de 12 GB puedes reducir `MODEL_MAX_BATCH_SIZE` a 1, activar `ENABLE_XFORMERS` y evaluar `MODEL_PRECISION=bf16` o `MODEL_PRECISION=fp16`.

## Instalación de dependencias

### 1. Frontend

```bash
npm install
```

### 2. Backend TypeScript (opcional)

Si implementas el backend Express propuesto:

```bash
cd backend
npm install
```

Los scripts sugeridos en la guía de diseño son:

- `npm run dev` – arranca el servidor con recarga en caliente (`ts-node-dev`).
- `npm run build` – compila a JavaScript (`tsc`).
- `npm run start` – ejecuta la versión compilada (`node dist/server.js`).

### 3. Entorno Python para la inferencia

```bash
python -m venv .venv
source .venv/bin/activate  # En Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install torch --index-url https://download.pytorch.org/whl/cu121
pip install diffusers transformers accelerate safetensors torchvision
# Instala xFormers solo si tu GPU lo soporta
pip install xformers
```

## Descarga de checkpoints

Los modelos recomendados son:

- [`stabilityai/stable-diffusion-xl-base-1.0`](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0)
- [`stabilityai/stable-diffusion-xl-refiner-1.0`](https://huggingface.co/stabilityai/stable-diffusion-xl-refiner-1.0)

1. Crea una cuenta en Hugging Face y acepta la licencia *CreativeML Open RAIL++-M* para ambos repositorios.
2. Inicia sesión en la CLI y descarga los checkpoints:

   ```bash
   huggingface-cli login
   huggingface-cli download stabilityai/stable-diffusion-xl-base-1.0 --local-dir ./models/sdxl-base
   huggingface-cli download stabilityai/stable-diffusion-xl-refiner-1.0 --local-dir ./models/sdxl-refiner
   ```

3. Actualiza `.env.local` y/o `.env` con las rutas `MODEL_CHECKPOINT_DIR` y `MODEL_REFINER_CHECKPOINT_DIR`.

## Configuración de variables de entorno

Copia el archivo de ejemplo incluido en el repositorio:

```bash
cp .env.example .env.local
```

Variables clave:

| Variable | Descripción |
| -------- | ----------- |
| `GEMINI_API_KEY` | Clave para seguir usando la API de Gemini (modo nube). Déjala vacía si solo empleas el backend local. |
| `IMAGE_SERVICE_BASE_URL` | URL del backend local, por ejemplo `http://localhost:4000`. |
| `MODEL_CHECKPOINT_DIR` | Ruta al checkpoint base descargado. |
| `MODEL_REFINER_CHECKPOINT_DIR` | Ruta al checkpoint del refiner; opcional pero recomendado. |
| `MODEL_DEVICE` | Dispositivo de inferencia (`cuda`, `cuda:0`, `mps`, `cpu`). |
| `MODEL_PRECISION` | Precisión a usar (`fp32`, `fp16`, `bf16`). |
| `ENABLE_XFORMERS` | Activa optimizaciones de memoria (`1` = sí, `0` = no). |
| `MODEL_MAX_BATCH_SIZE` | Tamaño máximo del lote para generar imágenes. |
| `BACKEND_PORT` | Puerto en el que expone los endpoints REST. |

## Lanzamiento del servicio local

1. Asegúrate de que las rutas de los checkpoints existen y que la GPU está visible (`nvidia-smi`).
2. Exporta las variables de entorno (Linux/macOS):

   ```bash
   export $(grep -v '^#' .env.local | xargs)
   ```

   En Windows puedes usar `set` o importar el archivo con PowerShell.

3. Arranca el backend según tu implementación. Si sigues la versión Express documentada, crea los scripts descritos (`dev`, `build`, `start`) en el `package.json` del directorio `backend/` y ejecútalos desde allí, por ejemplo:

   ```bash
   cd backend
   npm run dev
   ```

   Si optas por un microservicio Python, puedes lanzar un servidor FastAPI propio (por ejemplo, definiendo una aplicación `app` en `aura_backend/server.py`) y arrancarlo con:

   ```bash
   uvicorn aura_backend.server:app --host 0.0.0.0 --port ${BACKEND_PORT:-4000}
   ```

4. Modifica `IMAGE_SERVICE_BASE_URL` y actualiza el cliente de frontend (por ejemplo [`services/geminiService.ts`](../services/geminiService.ts)) para que utilice `fetch` contra los endpoints `/generate` y `/refine` del backend local.
5. Ejecuta el frontend con `npm run dev` y verifica en la consola del backend que las peticiones `/generate` y `/refine` se dirigen al servicio local.

## Optimización y buenas prácticas

- **FP16/BF16**: reduce a la mitad el uso de memoria con una ligera pérdida de precisión. Si observas artefactos, vuelve a `fp32`.
- **xFormers**: habilita kernels de atención más eficientes. Requiere CUDA 11.8+.
- **Compilación Torch 2.0 (`torch.compile`)**: puede acelerar la inferencia tras un par de ejecuciones de calentamiento.
- **Paginar la VRAM**: ajusta `MODEL_MAX_BATCH_SIZE` y libera otros procesos en la GPU antes de generar imágenes.

## Licencias y cumplimiento

- Los checkpoints SDXL están cubiertos por la licencia [CreativeML Open RAIL++-M](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/blob/main/README.md#license). Debes aceptar los términos en Hugging Face antes de descargar y respetar las cláusulas de uso.
- Verifica que cualquier output generado cumple con los lineamientos de contenido aceptable definidos por la licencia.
- Si redistribuyes el servicio, incluye la atribución correspondiente y asegúrate de que los usuarios finales también acepten la licencia.

## Solución de problemas

| Problema | Causa probable | Mitigación |
| -------- | -------------- | ---------- |
| `CUDA out of memory` | VRAM insuficiente | Reducir `MODEL_MAX_BATCH_SIZE`, activar `ENABLE_XFORMERS`, bajar a `MODEL_PRECISION=fp16`. |
| Latencia alta | CPU/GPU lenta o modo `cpu` | Cambiar a `cuda`, reducir el tamaño de imagen, precalentar el modelo. |
| Error 403 al descargar checkpoints | Licencia no aceptada | Acepta los términos en Hugging Face e inicia sesión con `huggingface-cli login`. |
| Respuestas vacías en el frontend | Variables sin configurar | Revisa `.env.local` y el log del backend para confirmar que las rutas a los modelos son correctas. |

