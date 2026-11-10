// Cliente HTTP para hablar con el backend Django.
//
// - Todas las rutas son relativas (/api/...). En desarrollo, Vite las reenvía a
//   http://localhost:8000 (ver vite.config.ts); en el servidor lo hace Nginx.
// - Guarda los tokens JWT del profesor en localStorage y agrega el "access" a cada
//   petición (encabezado Authorization: Bearer ...).
// - Si el backend responde 401 (el access venció, dura 30 min), pide uno nuevo con
//   el "refresh" y repite la petición UNA vez. Si eso también falla (el refresh venció
//   o se cerró la sesión), borra los tokens y avisa para volver al login.

const ACCESS_KEY = 'levi.auth.access';
const REFRESH_KEY = 'levi.auth.refresh';

export const SESSION_EXPIRED = 'Tu sesión expiró. Vuelve a iniciar sesión.';

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ------------------------------------------------------------------ //
// Tokens

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* almacenamiento bloqueado: los tokens quedan solo en memoria */
  }
}

const tokens = { access: read(ACCESS_KEY), refresh: read(REFRESH_KEY) };

function saveTokens(access: string | null, refresh: string | null) {
  tokens.access = access;
  tokens.refresh = refresh;
  write(ACCESS_KEY, access);
  write(REFRESH_KEY, refresh);
}

/** ¿Hay tokens guardados de una visita anterior? (todavía no se sabe si siguen vigentes) */
export function hasStoredSession(): boolean {
  return !!tokens.refresh;
}

const expiredListeners = new Set<() => void>();

/** Avisa cuando la sesión expiró y hay que volver al login. Devuelve la función para dejar de escuchar. */
export function onSessionExpired(listener: () => void): () => void {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
}

function endSession() {
  saveTokens(null, null);
  expiredListeners.forEach((listener) => listener());
}

// ------------------------------------------------------------------ //
// Peticiones

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

async function send(method: Method, path: string, body: unknown, withToken: boolean): Promise<Response> {
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
        saveTokens(data.access, tokens.refresh);
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

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let res = await send(method, path, body, true);
  if (res.status === 401 && (await refreshAccess())) {
    res = await send(method, path, body, true);
  }
  if (res.status === 401) {
    endSession();
    throw new ApiError(401, SESSION_EXPIRED);
  }
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: (path: string) => request<void>('DELETE', path),
};

// ------------------------------------------------------------------ //
// Inicio y cierre de sesión

export async function login(username: string, password: string): Promise<void> {
  const res = await send('POST', '/auth/login/', { username, password }, false);
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  const data = (await res.json()) as { access: string; refresh: string };
  saveTokens(data.access, data.refresh);
}

/** Borra los tokens de inmediato y le pide al backend invalidar el refresh. */
export async function logout(): Promise<void> {
  const refresh = tokens.refresh;
  saveTokens(null, null);
  if (!refresh) return;
  try {
    await send('POST', '/auth/logout/', { refresh }, false);
  } catch {
    /* sin conexión: igual se borraron los tokens de este navegador */
  }
}

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

/** Django responde {"detail": "..."} o {"campo": ["mensaje"]}: se toma el primer mensaje. */
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
