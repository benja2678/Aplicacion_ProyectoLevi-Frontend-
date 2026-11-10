// Capa de datos.
//
// Toda la interfaz habla con este contrato (Repository), nunca con localStorage
// directamente. Para conectar Supabase basta con escribir `supabaseRepository`
// que cumpla la misma interfaz y cambiarlo en `repository` al final del archivo.
// Todos los métodos son async justamente para que el cambio no toque las pantallas.

import type { SessionLog, StoredSession, Student, StudentInput } from '../types';
import { buildDemoData, sessionId } from './demo';

export interface ImportResult {
  added: number;
  duplicated: number;
  invalid: { file: string; reason: string }[];
}

export interface Repository {
  listStudents(): Promise<Student[]>;
  createStudent(input: StudentInput): Promise<Student>;
  updateStudent(id: string, input: StudentInput): Promise<Student>;
  deleteStudent(id: string): Promise<void>;

  listSessions(): Promise<StoredSession[]>;
  deleteSession(id: string): Promise<void>;
  /** Sube sesiones exportadas del visor (archivos .json de la carpeta "sesiones"). */
  importSessions(files: { name: string; text: string }[]): Promise<ImportResult>;

  /** Solo para la versión local: restaura los datos de ejemplo / borra todo. */
  resetDemo?(): Promise<void>;
  clearAll?(): Promise<void>;
}

// ------------------------------------------------------------------ //

export function isSessionLog(x: unknown): x is SessionLog {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return typeof o.participantCode === 'string' && typeof o.experimentId === 'string' && Array.isArray(o.events);
}

const KEY_STUDENTS = 'levi.students.v2';
const KEY_SESSIONS = 'levi.sessions.v2';

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

function nowIso() {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function createLocalRepository(): Repository {
  let students = load<Student[]>(KEY_STUDENTS);
  let sessions = load<StoredSession[]>(KEY_SESSIONS);
  if (!students || !sessions) {
    const demo = buildDemoData();
    students = demo.students;
    sessions = demo.sessions;
    save(KEY_STUDENTS, students);
    save(KEY_SESSIONS, sessions);
  }
  let S = students;
  let L = sessions;

  const codeTaken = (code: string, exceptId?: string) =>
    S.some((s) => s.id !== exceptId && s.codigoParticipante.toUpperCase() === code.toUpperCase());

  const normalize = (input: StudentInput): StudentInput => ({
    ...input,
    nombre: input.nombre.trim(),
    asignatura: input.asignatura.trim(),
    codigoParticipante: input.codigoParticipante.trim().toUpperCase(),
  });

  return {
    async listStudents() {
      return [...S];
    },
    async createStudent(input) {
      const data = normalize(input);
      if (codeTaken(data.codigoParticipante)) throw new Error(`El código ${data.codigoParticipante} ya está asignado a otro alumno.`);
      const student: Student = { ...data, id: newId(), creadoEn: nowIso() };
      S = [...S, student];
      save(KEY_STUDENTS, S);
      return student;
    },
    async updateStudent(id, input) {
      const data = normalize(input);
      if (codeTaken(data.codigoParticipante, id)) throw new Error(`El código ${data.codigoParticipante} ya está asignado a otro alumno.`);
      const current = S.find((s) => s.id === id);
      if (!current) throw new Error('Alumno no encontrado.');
      const updated = { ...current, ...data };
      S = S.map((s) => (s.id === id ? updated : s));
      save(KEY_STUDENTS, S);
      return updated;
    },
    async deleteStudent(id) {
      S = S.filter((s) => s.id !== id);
      save(KEY_STUDENTS, S);
    },

    async listSessions() {
      return [...L];
    },
    async deleteSession(id) {
      L = L.filter((s) => s.id !== id);
      save(KEY_SESSIONS, L);
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
        const list = Array.isArray(data) ? data : [data];
        for (const item of list) {
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
          added.push({ id, log: item, source: 'importada', receivedAt: nowIso() });
          result.added++;
        }
      }
      L = [...L, ...added];
      save(KEY_SESSIONS, L);
      return result;
    },
    async resetDemo() {
      const demo = buildDemoData();
      S = demo.students;
      L = demo.sessions;
      save(KEY_STUDENTS, S);
      save(KEY_SESSIONS, L);
    },
    async clearAll() {
      S = [];
      L = [];
      save(KEY_STUDENTS, S);
      save(KEY_SESSIONS, L);
    },
  };
}

// Cambiar aquí por createSupabaseRepository() cuando exista el backend.
export const repository: Repository = createLocalRepository();
