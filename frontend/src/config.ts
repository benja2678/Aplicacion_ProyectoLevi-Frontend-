// Configuración de la página según el entorno (.env.dev o .env.prod).
// Es el ÚNICO archivo que lee import.meta.env: el resto del código usa `config`.

export type DataSource = 'local' | 'api';

/** Quita la "/" final: "/api/" -> "/api" */
const withoutTrailingSlash = (url: string) => url.replace(/\/+$/, '');

export const config = {
  /** "dev" o "prod" (el modo con que se ejecutó Vite). */
  mode: import.meta.env.MODE,
  /** api = backend Django con login · local = demo en el navegador. */
  dataSource: (import.meta.env.VITE_DATA_SOURCE === 'api' ? 'api' : 'local') as DataSource,
  /** Base de la API, sin "/" final. */
  apiUrl: withoutTrailingSlash(import.meta.env.VITE_API_URL || '/api'),
} as const;
