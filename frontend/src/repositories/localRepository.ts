// Repositorio de la demo: datos de ejemplo guardados en el navegador (localStorage).
// Sirve para mostrar el panel sin servidor (VITE_DATA_SOURCE=local).

import { isSessionLog, sessionId } from '../domain/sessions';
import { normalizeCode, normalizeStudentInput } from '../domain/students';
import type { ImportResult, StoredSession, Student } from '../types';
import { buildDemoData } from './demoData';
import type { Repository } from './Repository';

const KEY_STUDENTS = 'levi.students.v3';
const KEY_SESSIONS = 'levi.sessions.v3';

function load<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento lleno o bloqueado: se mantiene en memoria */
  }
}

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Fecha y hora local sin zona, como las escribe Unity: 2026-11-05T10:31:12 */
function nowLocal() {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function createLocalRepository(): Repository {
  let students = load<Student[]>(KEY_STUDENTS);
  let sessions = load<StoredSession[]>(KEY_SESSIONS);
  if (!students || !sessions) {
    ({ students, sessions } = buildDemoData());
    save(KEY_STUDENTS, students);
    save(KEY_SESSIONS, sessions);
  }
  let S: Student[] = students;
  let L: StoredSession[] = sessions;

  const setStudents = (next: Student[]) => save(KEY_STUDENTS, (S = next));
  const setSessions = (next: StoredSession[]) => save(KEY_SESSIONS, (L = next));

  const assertCodeFree = (code: string, exceptId?: string) => {
    if (S.some((s) => s.id !== exceptId && normalizeCode(s.codigoParticipante) === code)) {
      throw new Error(`El código ${code} ya está asignado a otro alumno.`);
    }
  };

  return {
    async listStudents() {
      return [...S];
    },
    async createStudent(input) {
      const data = normalizeStudentInput(input);
      assertCodeFree(data.codigoParticipante);
      const student: Student = { ...data, id: newId(), creadoEn: nowLocal() };
      setStudents([...S, student]);
      return student;
    },
    async updateStudent(id, input) {
      const data = normalizeStudentInput(input);
      assertCodeFree(data.codigoParticipante, id);
      const current = S.find((s) => s.id === id);
      if (!current) throw new Error('Alumno no encontrado.');
      const updated = { ...current, ...data };
      setStudents(S.map((s) => (s.id === id ? updated : s)));
      return updated;
    },
    async deleteStudent(id) {
      setStudents(S.filter((s) => s.id !== id));
    },

    async listSessions() {
      return [...L];
    },
    async deleteSession(id) {
      setSessions(L.filter((s) => s.id !== id));
    },
    async importSessions(files) {
      const result: ImportResult = { added: 0, duplicated: 0, invalid: [] };
      const ids = new Set(L.map((s) => s.id));
      const added: StoredSession[] = [];
      for (const f of files) {
        let data: unknown;
        try {
          data = JSON.parse(f.text);
        } catch {
          result.invalid.push({ file: f.name, reason: 'No es un JSON válido' });
          continue;
        }
        for (const item of Array.isArray(data) ? data : [data]) {
          if (!isSessionLog(item)) {
            result.invalid.push({ file: f.name, reason: 'No tiene el formato de registro de sesión' });
            continue;
          }
          const id = sessionId(item);
          if (ids.has(id)) {
            result.duplicated++;
            continue;
          }
          ids.add(id);
          added.push({ id, log: item, source: 'importada', receivedAt: nowLocal() });
          result.added++;
        }
      }
      setSessions([...L, ...added]);
      return result;
    },
    async clearAll() {
      setStudents([]);
      setSessions([]);
    },
  };
}
