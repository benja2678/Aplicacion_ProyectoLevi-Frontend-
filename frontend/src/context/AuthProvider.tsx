// Sesión del lector (solo con VITE_DATA_SOURCE=api).
// Si cualquier petición recibe 401 y no se puede renovar el token (por ejemplo, porque
// le quitaron el acceso en la tabla `lector`), se vuelve al login.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from '../api/authApi';
import { ApiError, SESSION_EXPIRED } from '../api/http';
import { hasStoredSession, onSessionExpired } from '../api/tokens';
import type { Account } from '../types';
import { AuthCtx, type AuthState, type AuthStatus } from './authState';

const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() => (hasStoredSession() ? 'checking' : 'signedOut'));
  const [account, setAccount] = useState<Account | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Al abrir la página con un token guardado, se comprueba que siga siendo válido.
  useEffect(() => {
    if (status !== 'checking') return;
    let cancelled = false;
    authApi
      .me()
      .then((me) => {
        if (cancelled) return;
        setAccount(me);
        setStatus('signedIn');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setStatus('signedOut');
        if (!(e instanceof ApiError && e.status === 401)) setNotice(messageOf(e));
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
        setAccount(null);
        setNotice(SESSION_EXPIRED);
      }),
    [],
  );

  const login = useCallback(async (email: string, password: string) => {
    await authApi.login(email.trim(), password);
    setAccount(await authApi.me());
    setNotice(null);
    setStatus('signedIn');
  }, []);

  const logout = useCallback(() => {
    void authApi.logout(); // borra los tokens al instante; el aviso al backend sigue en segundo plano
    setAccount(null);
    setNotice(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo<AuthState>(
    () => ({ status, account, notice, login, logout }),
    [status, account, notice, login, logout],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
