/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_IMAGE_BACKEND_URL?: string;
  readonly VITE_BACKEND_URL?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
