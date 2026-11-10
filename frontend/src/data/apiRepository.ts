// Implementación de Repository que usa la API de Django (proyecto-backend).
// Cumple el mismo contrato que la versión local, así que las pantallas no cambian.

import type { StoredSession, Student, StudentInput } from '../types';
import { api, ApiError } from './api';
import type { ImportResult, Repository } from './repository';

/** "Cargar sesiones" se envía en tandas para no superar el límite de tamaño del servidor (50 MB). */
const MAX_BATCH_BYTES = 8 * 1024 * 1024;

type FileText = { name: string; text: string };

function inBatches(files: FileText[]): FileText[][] {
  const encoder = new TextEncoder();
  const batches: FileText[][] = [];
  let current: FileText[] = [];
  let size = 0;
  for (const f of files) {
    const bytes = encoder.encode(f.text).length;
    if (current.length > 0 && size + bytes > MAX_BATCH_BYTES) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(f);
    size += bytes;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

const path = (base: string, id: string) => `${base}${encodeURIComponent(id)}/`;

export function createApiRepository(): Repository {
  return {
    listStudents: () => api.get<Student[]>('/students/'),
    createStudent: (input: StudentInput) => api.post<Student>('/students/', input),
    updateStudent: (id: string, input: StudentInput) => api.put<Student>(path('/students/', id), input),
    deleteStudent: (id: string) => api.delete(path('/students/', id)),

    listSessions: () => api.get<StoredSession[]>('/sessions/'),
    // El id lleva ":" (de startedAt): encodeURIComponent lo deja seguro para la URL.
    deleteSession: (id: string) => api.delete(path('/sessions/', id)),

    async importSessions(files) {
      const total: ImportResult = { added: 0, duplicated: 0, invalid: [] };
      for (const batch of inBatches(files)) {
        try {
          const r = await api.post<ImportResult>('/sessions/import/', { files: batch });
          total.added += r.added;
          total.duplicated += r.duplicated;
          total.invalid.push(...r.invalid);
        } catch (e) {
          if (e instanceof ApiError && e.status === 413) {
            total.invalid.push(...batch.map((f) => ({ file: f.name, reason: 'Archivo demasiado grande para subirlo' })));
            continue;
          }
          throw e;
        }
      }
      return total;
    },
    // resetDemo y clearAll no existen aquí: son solo para la demo con localStorage.
  };
}
