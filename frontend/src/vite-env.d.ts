/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "api" = backend Django con login · "local" (o sin definir) = demo con localStorage */
  readonly VITE_DATA_SOURCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
