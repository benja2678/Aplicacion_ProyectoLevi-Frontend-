// Forma del estado de la sesión y el hook para leerlo (el componente está en AuthProvider.tsx).

import { createContext, useContext } from 'react';
import type { Account } from '../types';

/**
 *   checking  -> hay un token guardado y se está comprobando que siga vigente
 *   signedOut -> se muestra la pantalla de login
 *   signedIn  -> se muestra el panel
 */
export type AuthStatus = 'checking' | 'signedOut' | 'signedIn';

export interface AuthState {
  status: AuthStatus;
  account: Account | null;
  /** Aviso para la pantalla de login (por ejemplo, que la sesión expiró). */
  notice: string | null;
  login(email: string, password: string): Promise<void>;
  logout(): void;
}

export const AuthCtx = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return v;
}
