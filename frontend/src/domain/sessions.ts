// Reglas de las sesiones del visor. Funciones puras.

import type { SessionLog } from '../types';

/** ¿Tiene la forma mínima de un registro de sesión de Unity (SessionLog.cs)? */
export function isSessionLog(x: unknown): x is SessionLog {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return typeof o.participantCode === 'string' && typeof o.experimentId === 'string' && Array.isArray(o.events);
}

/** participantCode_experimentId_startedAt: el mismo identificador que usa el backend. */
export function sessionId(log: SessionLog): string {
  return `${log.participantCode}_${log.experimentId}_${log.startedAt}`;
}
