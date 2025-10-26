# Análisis Técnico, de Diseño y Arquitectura - Aura Reflect

## Resumen Ejecutivo

Aura Reflect es una aplicación web para generación de moodboards visuales utilizando inteligencia artificial local. El proyecto combina un frontend React moderno con un backend Python que ejecuta modelos de IA (Stable Diffusion y BLIP) para generar y refinar imágenes basadas en prompts de texto.

## 1. Visión General del Proyecto

### Propósito

- **Función Principal**: Generador de moodboards visuales mediante IA local
- **Características Clave**:
  - Generación de imágenes iniciales desde prompts de texto
  - Refinamiento de imágenes basado en descripciones automáticas (image-to-image)
  - Galería para guardar y organizar moodboards
  - Configuración avanzada de parámetros de IA (steps, guidance scale, aspect ratios)

### Stack Tecnológico

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: FastAPI (Python) + Pydantic v2
- **Modelos de IA**: Stable Diffusion (Diffusers), BLIP (Transformers)
- **Testing**: Vitest + Testing Library
- **Build**: Vite para desarrollo y producción

## 2. Arquitectura Frontend

### Estructura del Código Frontend

```tree
src/
├── components/          # Componentes UI reutilizables
│   ├── Header.tsx
│   ├── PromptForm.tsx   # Formulario principal con configuración
│   ├── ImageGrid.tsx    # Grid de imágenes generadas
│   ├── RefinePanel.tsx  # Panel de refinamiento
│   ├── Gallery.tsx      # Galería de moodboards guardados
│   └── Spinner.tsx      # Indicador de carga
├── services/            # Lógica de integración con APIs
│   ├── localEngineService.ts  # Cliente HTTP para backend local
│   └── geminiService.ts       # Cliente para API de Gemini (legacy)
├── types.ts             # Definiciones TypeScript
├── constants.ts         # Constantes de la aplicación
└── App.tsx              # Componente raíz con state management
```

### Patrón de Estado

- **Gestión de Estado**: React hooks (useState, useCallback, useMemo)
- **Estados de la App**: INITIAL → GENERATING → RESULTS → REFINING → GALLERY
- **Flujo de Datos**: Unidireccional desde App.tsx hacia componentes hijos
- **Manejo de Errores**: Estados locales con mensajes de error en UI

### UI/UX Design

- **Estilo**: Dark theme con gradientes purple/pink
- **Responsive**: Grid layouts adaptativos
- **Accesibilidad**: Labels apropiados, roles ARIA, manejo de estados disabled
- **Feedback Visual**: Loading spinners, mensajes de estado, animaciones hover

## 3. Arquitectura Backend

### Estructura del Código Backend

```tree
backend/
├── app.py              # Servidor FastAPI principal
├── requirements.txt    # Dependencias Python
└── [modelos de IA]     # Se cargan dinámicamente desde Hugging Face

server/                  # Backend alternativo (Node.js/FastAPI legacy)
├── index.js
├── routes/
├── controllers/
└── services/
```

### API Endpoints

- **POST /generate**: Genera 2 imágenes iniciales desde prompt
  - Request: `{prompt, aspectRatio, temperature}`
  - Response: `{images: [base64, base64]}`
- **POST /refine**: Refina imágenes usando BLIP + Stable Diffusion
  - Request: `{images: [base64], refinePrompt}`
  - Response: `{images: [base64, base64]}`

### Modelos de IA

- **Stable Diffusion**: Generación de imágenes (CompVis/stable-diffusion-v1-4)
- **BLIP**: Descripción automática de imágenes (Salesforce/blip-image-captioning-base)
- **Configuración**: GPU auto-detección, configurable guidance scale y aspect ratios

## 4. Flujo de Datos y Contratos API

### Frontend → Backend

```typescript
// Generate Request
{
  prompt: string,
  aspectRatio: string,    // "1:1", "9:16", "16:9", etc.
  temperature: number,     // 0-1, mapeado a guidance_scale 7-15
  config?: {              // Ignorado por backend actual
    steps: number,
    guidanceScale: number
  }
}

// Refine Request
{
  images: string[],       // Array de data URIs
  refinePrompt: string,
  config?: {...}          // Ignorado
}
```

### Backend → Frontend

```json
{
  "images": [
    "iVBORw0KGgoAAAANSUhEUgAA...", // Base64 PNG sin data URI
    "iVBORw0KGgoAAAANSUhEUgAA..."
  ]
}
```

### Procesamiento de Imágenes

1. Frontend envía data URIs → Backend extrae base64
2. Backend genera imágenes → Retorna base64 arrays
3. Frontend prependea `data:image/png;base64,` para renderizado

## 5. Calidad del Código y Patrones

### Fortalezas

- **TypeScript**: Tipado fuerte en frontend y backend
- **Componentes Funcionales**: Hooks modernos, sin clases legacy
- **Separación de Concerns**: Services, components, types bien organizados
- **Manejo de Errores**: Try-catch con feedback de usuario
- **Testing**: Tests de integración con mocks apropiados

### Patrones Utilizados

- **Custom Hooks**: useCallback para optimización de renders
- **Prop Drilling Controlado**: State lifting en App.tsx
- **Factory Pattern**: Formateo de imágenes en services
- **Observer Pattern**: Event handlers para UI interactions

### Debilidades

- **State Management**: Creciendo en complejidad, podría beneficiarse de Zustand/Redux
- **Error Handling**: Mensajes genéricos, falta logging estructurado
- **Performance**: Sin memoización de componentes pesados
- **Testing Coverage**: Solo tests de integración, faltan unit tests

## 6. Inconsistencias e Issues Identificados

### Inconsistencias Arquitectónicas

1. **Backends Duplicados**:

   - `backend/app.py` (Python/FastAPI - actual)
   - `server/` (Node.js/FastAPI - legacy)
   - Frontend apunta a localhost:8000 (Python)

2. **Documentación Desactualizada**:

   - `docs/backend_design.md` describe Node.js backend
   - `docs/local_service_setup.md` menciona ambos
   - README apunta a backend Python

3. **CORS Mismatch**:

   - Frontend: localhost:8080 (vite.config.ts)
   - Backend CORS: localhost:8082
   - API calls: localhost:8000

4. **Testing Legacy**:
   - Tests mockean `geminiService` (API externa)
   - Código actual usa `localEngineService`
   - Tests no cubren el flujo local actual

### Issues Técnicos

1. **Pydantic Field Mapping**: Problemas iniciales con camelCase/snake_case
2. **Model Loading**: Sin lazy loading, carga en import time
3. **Error Handling**: Falta validación de base64 en refine
4. **Configuration**: Hardcoded values (NUM_IMAGES=2, guidance_scale=10)

## 7. Estrategia de Testing

### Framework

- **Vitest**: Testing runner moderno con React support
- **Testing Library**: User-centric testing approach
- **Mocks**: Vitest mocking para services externos

### Cobertura Actual

- ✅ Tests de integración para flujo principal
- ✅ Mocking de API calls
- ✅ Error handling scenarios
- ❌ Unit tests para componentes individuales
- ❌ Tests para backend API
- ❌ E2E tests

### Recomendaciones

- Actualizar tests para usar `localEngineService`
- Agregar tests unitarios para components
- Implementar tests de API con supertest para backend
- Configurar coverage reporting

## 8. Configuración de Desarrollo y Deployment

### Desarrollo Local

```bash
# Frontend
npm install
npm run dev  # localhost:8080

# Backend
cd backend
pip install -r requirements.txt
python app.py  # localhost:8000
```

### Variables de Entorno

- **Frontend**: `VITE_LOCAL_ENGINE_URL` (default: localhost:8000)
- **Backend**: Sin .env, configuración hardcoded

### Build y Producción

- **Frontend**: `npm run build` → dist/
- **Backend**: Directo con Python/uvicorn
- **Deployment**: No configurado (falta Docker, CI/CD)

## 9. Recomendaciones de Mejora

### Arquitectura

1. **Unificar Backend**: Elegir Python o Node.js, remover código duplicado
2. **State Management**: Implementar Zustand para state global
3. **API Design**: Agregar versionado (`/v1/generate`)
4. **Configuration**: Usar variables de entorno en backend

### Código

1. **Error Handling**: Implementar logging estructurado (Python logging)
2. **Validation**: Agregar schemas JSON para requests
3. **Performance**: Lazy loading de modelos, caching de responses
4. **Security**: Rate limiting, input sanitization

### Testing

1. **Coverage**: Apuntar a >80% coverage
2. **E2E**: Playwright para tests de usuario
3. **Backend Tests**: Pytest para API endpoints

### DevOps

1. **Docker**: Containerizar aplicación completa
2. **CI/CD**: GitHub Actions para tests y builds
3. **Monitoring**: Health checks, metrics

## 10. Evaluación General

### Puntuación Técnica (1-10)

- **Arquitectura**: 7/10 (buena separación, pero inconsistencias)
- **Calidad de Código**: 8/10 (TypeScript, patterns modernos)
- **Testing**: 5/10 (básico, necesita expansión)
- **Documentación**: 6/10 (parcial, desactualizada)
- **Mantenibilidad**: 7/10 (estructura clara, pero deuda técnica)

### Estado del Proyecto

- **MVP Funcional**: ✅ Generación y refinamiento de imágenes
- **Producción Ready**: ❌ Falta testing, error handling, deployment
- **Escalabilidad**: ⚠️ Limitada por recursos GPU locales

### Próximos Pasos Críticos

1. Resolver inconsistencias de backend
2. Actualizar documentación
3. Expandir testing
4. Configurar deployment pipeline

El proyecto muestra una base sólida con tecnología moderna, pero requiere limpieza arquitectónica y mejora en testing para ser production-ready.
