/// <reference types="vite/client" />

// Variables de .env.dev / .env.prod que usa la página (se leen en src/config.ts).
interface ImportMetaEnv {
  /** "api" = backend Django con login · "local" (o sin definir) = demo con localStorage */
  readonly VITE_DATA_SOURCE?: string;
  /** Base de la API. Por defecto "/api" (misma dirección que la página). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
