// Tokens JWT del lector conectado (docente o equipo).
//
// - Se guardan en localStorage para no tener que iniciar sesión en cada visita.
// - Si el navegador bloquea el almacenamiento, quedan solo en memoria.
// - Cuando la sesión vence y no se puede renovar, se avisa a quien esté escuchando
//   (context/AuthProvider.tsx) para volver a la pantalla de login.

const ACCESS_KEY = 'levi.auth.access';
const REFRESH_KEY = 'levi.auth.refresh';

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

const current = { access: read(ACCESS_KEY), refresh: read(REFRESH_KEY) };

export const tokens = {
  get access() {
    return current.access;
  },
  get refresh() {
    return current.refresh;
  },
  save(access: string | null, refresh: string | null) {
    current.access = access;
    current.refresh = refresh;
    write(ACCESS_KEY, access);
    write(REFRESH_KEY, refresh);
  },
  clear() {
    tokens.save(null, null);
  },
};

/** ¿Hay una sesión guardada de una visita anterior? (todavía no se sabe si sigue vigente) */
export function hasStoredSession(): boolean {
  return !!current.refresh;
}

const expiredListeners = new Set<() => void>();

/** Avisa cuando la sesión venció y hay que volver al login. Devuelve la función para dejar de escuchar. */
export function onSessionExpired(listener: () => void): () => void {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
}

/** Borra los tokens y avisa que la sesión terminó. */
export function expireSession() {
  tokens.clear();
  expiredListeners.forEach((listener) => listener());
}
