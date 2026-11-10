// Estado de la sesión del profesor (solo en modo VITE_DATA_SOURCE=api).
//
//   checking  -> hay un token guardado y se está comprobando que siga vigente
//   signedOut -> se muestra la pantalla de login
//   signedIn  -> se muestra el panel
//
// Si cualquier petición recibe 401 y no se puede renovar el token, se vuelve al login.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, hasStoredSession, login as apiLogin, logout as apiLogout, onSessionExpired, SESSION_EXPIRED } from './api';

type AuthStatus = 'checking' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  username: string | null;
  /** Aviso para la pantalla de login (por ejemplo, que la sesión expiró). */
  notice: string | null;
  login(username: string, password: string): Promise<void>;
  logout(): void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() => (hasStoredSession() ? 'checking' : 'signedOut'));
  const [username, setUsername] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Al abrir la página con un token guardado, se comprueba que siga siendo válido.
  useEffect(() => {
    if (status !== 'checking') return;
    let cancelled = false;
    api
      .get<{ username: string }>('/auth/me/')
      .then((me) => {
        if (cancelled) return;
        setUsername(me.username);
        setStatus('signedIn');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setStatus('signedOut');
        if (!(e instanceof ApiError && e.status === 401)) setNotice(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  // Token vencido y sin posibilidad de renovarlo: de vuelta al login.
  useEffect(
    () =>
      onSessionExpired(() => {
        setStatus('signedOut');
        setUsername(null);
        setNotice(SESSION_EXPIRED);
      }),
    [],
  );

  const login = useCallback(async (user: string, password: string) => {
    await apiLogin(user.trim(), password);
    setUsername(user.trim());
    setNotice(null);
    setStatus('signedIn');
  }, []);

  const logout = useCallback(() => {
    void apiLogout(); // borra los tokens al instante; el aviso al backend sigue en segundo plano
    setUsername(null);
    setNotice(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo<AuthState>(
    () => ({ status, username, notice, login, logout }),
    [status, username, notice, login, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return v;
}
