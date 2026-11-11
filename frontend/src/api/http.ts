// Cliente HTTP del backend Django. Es el único lugar de la aplicación que usa fetch.
//
// - Las rutas son relativas (/api/...): en desarrollo Vite las reenvía a
//   http://localhost:8000 (vite.config.ts); en el servidor lo hace Nginx.
// - Agrega el token "access" a cada petición (Authorization: Bearer ...).
// - Si el backend responde 401 (el access dura 30 min), pide uno nuevo con el
//   "refresh" y repite la petición UNA vez. Si tampoco se puede, la sesión terminó.
// - Convierte cualquier error en un ApiError con un mensaje legible en español.

import { expireSession, tokens } from './tokens';

export const SESSION_EXPIRED = 'Tu sesión expiró. Vuelve a iniciar sesión.';

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** Una petición sin reintentos. `withToken=false` para login, refresh y logout. */
export async function send(method: Method, path: string, body?: unknown, withToken = true): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (withToken && tokens.access) headers.Authorization = `Bearer ${tokens.access}`;
  try {
    return await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión o que el backend esté encendido.');
  }
}

/** Lee la respuesta como JSON (o undefined si viene vacía) y lanza ApiError si no fue exitosa. */
export async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// Si varias peticiones reciben 401 al mismo tiempo, se pide un solo token nuevo.
let refreshing: Promise<boolean> | null = null;

function refreshAccess(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      if (!tokens.refresh) return false;
      try {
        const res = await send('POST', '/auth/refresh/', { refresh: tokens.refresh }, false);
        if (!res.ok) return false;
        const data = (await res.json()) as { access: string };
        tokens.save(data.access, tokens.refresh);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

/** Petición con token: renueva el access si venció y, si no se puede, termina la sesión. */
async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let res = await send(method, path, body);
  if (res.status === 401 && (await refreshAccess())) {
    res = await send(method, path, body);
  }
  if (res.status === 401) {
    expireSession();
    throw new ApiError(401, SESSION_EXPIRED);
  }
  return readJson<T>(res);
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: (path: string) => request<void>('DELETE', path),
};

/** Parte de una URL con un id que puede traer ":" u otros caracteres (ej. ids de sesión). */
export const withId = (base: string, id: string) => `${base}${encodeURIComponent(id)}/`;

// ------------------------------------------------------------------ //
// Mensajes de error legibles

async function errorMessage(res: Response): Promise<string> {
  if (res.status === 429) {
    const wait = Number(res.headers.get('Retry-After'));
    return wait > 0
      ? `Demasiados intentos. Espera ${wait} segundos e inténtalo de nuevo.`
      : 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.';
  }
  if (res.status === 413) return 'Lo que intentas subir es demasiado grande.';

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* la respuesta no es JSON (por ejemplo, una página de error de Nginx) */
  }
  const message = firstMessage(data);
  if (message) return message;
  if (res.status === 403) return 'No tienes permiso para hacer esto.';
  if (res.status === 404) return 'No se encontró (puede que ya se haya borrado).';
  if (res.status >= 500) return `Error del servidor (código ${res.status}). Inténtalo más tarde.`;
  return `Error inesperado (código ${res.status}).`;
}

/** El backend responde {"detail": "..."} o {"campo": ["mensaje"]}: se toma el primer mensaje. */
function firstMessage(data: unknown): string | null {
  if (typeof data === 'string') return data || null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const m = firstMessage(item);
      if (m) return m;
    }
    return null;
  }
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>;
    if (typeof o.detail === 'string') return o.detail;
    for (const value of Object.values(o)) {
      const m = firstMessage(value);
      if (m) return m;
    }
  }
  return null;
}
