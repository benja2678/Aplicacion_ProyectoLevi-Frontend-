// Sesiones: /api/sessions/
// El id de una sesión es participantCode_experimentId_startedAt (lleva ":").

import type { ImportResult, SessionFile, StoredSession } from '../types';
import { ApiError, http, withId } from './http';

const BASE = '/sessions/';

/** "Cargar sesiones" se envía en tandas para no superar el límite del servidor (50 MB). */
const MAX_BATCH_BYTES = 8 * 1024 * 1024;

function inBatches(files: SessionFile[]): SessionFile[][] {
  const encoder = new TextEncoder();
  const batches: SessionFile[][] = [];
  let batch: SessionFile[] = [];
  let size = 0;
  for (const f of files) {
    const bytes = encoder.encode(f.text).length;
    if (batch.length > 0 && size + bytes > MAX_BATCH_BYTES) {
      batches.push(batch);
      batch = [];
      size = 0;
    }
    batch.push(f);
    size += bytes;
  }
  if (batch.length > 0) batches.push(batch);
  return batches;
}

async function importFiles(files: SessionFile[]): Promise<ImportResult> {
  const total: ImportResult = { added: 0, duplicated: 0, invalid: [] };
  for (const batch of inBatches(files)) {
    try {
      const r = await http.post<ImportResult>(`${BASE}import/`, { files: batch });
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
}

export const sessionsApi = {
  list: () => http.get<StoredSession[]>(BASE),
  remove: (id: string) => http.delete(withId(BASE, id)),
  importFiles,
};
