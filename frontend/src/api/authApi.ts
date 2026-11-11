// Inicio y cierre de sesión del lector (tabla `lector` del backend: docente o equipo).
//
//   POST /api/auth/login/   {username: correo, password} -> {access, refresh}
//   POST /api/auth/logout/  {refresh}                    -> invalida el refresh
//   GET  /api/auth/me/                                   -> {username, nombre, rol}

import type { Account } from '../types';
import { http, readJson, send } from './http';
import { tokens } from './tokens';

export async function login(email: string, password: string): Promise<void> {
  const res = await send('POST', '/auth/login/', { username: email, password }, false);
  const data = await readJson<{ access: string; refresh: string }>(res);
  tokens.save(data.access, data.refresh);
}

/** Borra los tokens de inmediato y le pide al backend invalidar el refresh. */
export async function logout(): Promise<void> {
  const refresh = tokens.refresh;
  tokens.clear();
  if (!refresh) return;
  try {
    await send('POST', '/auth/logout/', { refresh }, false);
  } catch {
    /* sin conexión: igual se borraron los tokens de este navegador */
  }
}

interface MeResponse {
  username: string;
  nombre: string;
  rol: string;
}

/** El lector conectado (también sirve para comprobar que el token sigue vigente). */
export async function me(): Promise<Account> {
  const r = await http.get<MeResponse>('/auth/me/');
  return { email: r.username, name: r.nombre || r.username, role: r.rol };
}
