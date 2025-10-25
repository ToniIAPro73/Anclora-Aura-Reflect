<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Aura Reflect – Local Development Guide

This repository contains the React frontend for Aura Reflect along with documentation for the companion backend described in [`
docs/backend_design.md`](./docs/backend_design.md).

View the original AI Studio app: https://ai.studio/apps/drive/1bgjlqJ61J71FTs1FPg91aH7pvte4oNb3

## Requisitos previos

- **Node.js 20+ y npm 10+** para ejecutar el frontend Vite/React.
- **Python 3.10+** y `pip` para el servicio de inferencia local descrito en [`docs/backend_design.md`](docs/backend_design.md).
- **GPU NVIDIA** con al menos **12 GB de VRAM** (16 GB recomendados) para ejecutar `Stable Diffusion XL` en local. Consulta la sección [Requisitos de hardware](docs/local_service_setup.md#requisitos-de-hardware) para más detalles y alternativas.

## Configuración rápida

1. **Clona el repositorio** y accede al directorio del proyecto.
2. **Instala las dependencias del frontend**:
   ```bash
   npm install
   ```
3. **Crea tu archivo de variables de entorno** copiando el ejemplo incluido:
   ```bash
   cp .env.example .env.local
   ```
   Completa los valores según quieras usar la API de Gemini o tu propio backend local (ver más abajo).
4. **Arranca el frontend** en modo desarrollo:
   ```bash
   npm run dev
   ```
   Por defecto el frontend consumirá la API de Gemini si encuentra `GEMINI_API_KEY`. Si deseas consumir el backend local tendrás que exponer su URL (por ejemplo mediante `IMAGE_SERVICE_BASE_URL`) y adaptar [`services/geminiService.ts`](services/geminiService.ts) para llamar a los endpoints REST descritos en la documentación.

## Servicio de inferencia local

El archivo [`docs/local_service_setup.md`](docs/local_service_setup.md) detalla los pasos para:

1. Instalar dependencias adicionales (Node/Express o Python según tu implementación preferida).
2. Descargar los checkpoints de **Stable Diffusion XL Base** y **Refiner** desde Hugging Face respetando su licencia *CreativeML Open RAIL++-M*.
3. Configurar variables como `MODEL_CHECKPOINT_DIR`, `MODEL_DEVICE`, `ENABLE_XFORMERS` o `MODEL_PRECISION`.
4. Lanzar el servicio REST local siguiendo la referencia de Express incluida en la documentación y apuntar el frontend al nuevo endpoint.

> ℹ️ El frontend sigue soportando el flujo alojado en la nube mediante Gemini. Las instrucciones del servicio local son optativas, pero te permiten trabajar completamente offline cuando dispongas del hardware necesario.

## Documentación adicional

- [`docs/backend_design.md`](docs/backend_design.md): arquitectura de referencia para el backend local.
- [`docs/local_service_setup.md`](docs/local_service_setup.md): guía paso a paso para dependencias, checkpoints, optimizaciones y arranque del servicio.
