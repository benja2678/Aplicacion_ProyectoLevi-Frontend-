// Reglas de los alumnos. Funciones puras: no usan React, ni la red, ni localStorage.

import type { StoredSession, Student, StudentInput } from '../types';
import { sortByDateDesc } from './metrics';

/** Los códigos se comparan siempre en mayúsculas ("a001" y "A001" son el mismo). */
export const normalizeCode = (code: string) => code.trim().toUpperCase();

export function normalizeStudentInput(input: StudentInput): StudentInput {
  return {
    nombre: input.nombre.trim(),
    apellido: input.apellido.trim(),
    asignatura: input.asignatura.trim(),
    codigoParticipante: normalizeCode(input.codigoParticipante),
  };
}

/** "Camila Rojas" (nombre + apellido, si tiene). */
export const fullName = (s: Pick<Student, 'nombre' | 'apellido'>) => `${s.nombre} ${s.apellido ?? ''}`.trim();

/** Siguiente código libre para un alumno nuevo: A001, A002... */
export function nextFreeCode(taken: Set<string>): string {
  for (let i = 1; i < 1000; i++) {
    const code = `A${i.toString().padStart(3, '0')}`;
    if (!taken.has(code)) return code;
  }
  return '';
}

/** Alumnos ordenados por nombre que coinciden con la búsqueda (nombre, apellido o código). */
export function searchStudents(students: Student[], query: string): Student[] {
  const term = query.trim().toLowerCase();
  return [...students]
    .sort((a, b) => fullName(a).localeCompare(fullName(b), 'es'))
    .filter((s) => !term || fullName(s).toLowerCase().includes(term) || s.codigoParticipante.toLowerCase().includes(term));
}

export interface CodeStats {
  count: number;
  /** startedAt de la última sesión */
  last: string;
}

/** Por código de visor: cuántas sesiones tiene y cuándo fue la última. */
export function sessionStatsByCode(sessions: StoredSession[]): Map<string, CodeStats> {
  const stats = new Map<string, CodeStats>();
  for (const s of sessions) {
    const code = normalizeCode(s.log.participantCode);
    const current = stats.get(code) ?? { count: 0, last: '' };
    stats.set(code, { count: current.count + 1, last: s.log.startedAt > current.last ? s.log.startedAt : current.last });
  }
  return stats;
}

/** Códigos con sesiones que todavía no son de ningún alumno (sin las pruebas del editor de Unity). */
export function orphanCodes(stats: Map<string, CodeStats>, studentByCode: Map<string, Student>): string[] {
  return [...stats.keys()].filter((c) => !studentByCode.has(c) && c !== 'EDITOR').sort();
}

/** Las sesiones de un alumno, de la más reciente a la más antigua. */
export function sessionsOf(student: Student, sessions: StoredSession[]): StoredSession[] {
  const code = normalizeCode(student.codigoParticipante);
  return sortByDateDesc(sessions.filter((s) => normalizeCode(s.log.participantCode) === code));
}
