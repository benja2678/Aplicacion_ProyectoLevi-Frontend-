// Datos del panel (alumnos y sesiones) y sus acciones, para todas las pantallas.
// Habla solo con el repositorio (repositories/), nunca con la API directamente.
// Después de cada cambio vuelve a cargar los datos, así todas las pantallas quedan al día.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { normalizeCode } from '../domain/students';
import { repository } from '../repositories';
import type { StoredSession, Student } from '../types';
import { DataCtx, type DataState } from './dataState';

const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function DataProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [st, se] = await Promise.all([repository.listStudents(), repository.listSessions()]);
      setStudents(st);
      setSessions(se);
      setError(null);
    } catch (e) {
      setError(`No se pudieron cargar los datos. ${messageOf(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<DataState>(() => {
    const studentByCode = new Map(students.map((s) => [normalizeCode(s.codigoParticipante), s]));

    /** Ejecuta la acción y luego recarga los datos. */
    const thenReload = async <T,>(action: Promise<T>) => {
      const result = await action;
      await reload();
      return result;
    };
    /** Igual, pero si falla lo muestra en el aviso general (borrar no tiene otro lugar donde avisar). */
    const reportingErrors = async <T,>(action: Promise<T>, what: string) => {
      try {
        return await thenReload(action);
      } catch (e) {
        setError(`${what}. ${messageOf(e)}`);
        throw e;
      }
    };

    const clearAll = repository.clearAll?.bind(repository);
    return {
      loading,
      error,
      students,
      sessions,
      studentByCode,
      reload,
      createStudent: (input) => thenReload(repository.createStudent(input)),
      updateStudent: (id, input) => thenReload(repository.updateStudent(id, input)),
      deleteStudent: (id) => reportingErrors(repository.deleteStudent(id), 'No se pudo eliminar al alumno'),
      deleteSession: (id) => reportingErrors(repository.deleteSession(id), 'No se pudo eliminar la sesión'),
      importSessions: (files) => thenReload(repository.importSessions(files)),
      clearAll: clearAll ? () => thenReload(clearAll()) : undefined,
    };
  }, [students, sessions, loading, error, reload]);

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}
