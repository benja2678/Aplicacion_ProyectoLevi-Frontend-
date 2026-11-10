import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { StoredSession, Student, StudentInput } from '../types';
import { repository, type ImportResult } from './repository';

interface DataState {
  loading: boolean;
  error: string | null;
  students: Student[];
  sessions: StoredSession[];
  /** código de participante (mayúsculas) -> alumno */
  studentByCode: Map<string, Student>;
  reload(): Promise<void>;
  createStudent(input: StudentInput): Promise<Student>;
  updateStudent(id: string, input: StudentInput): Promise<Student>;
  deleteStudent(id: string): Promise<void>;
  deleteSession(id: string): Promise<void>;
  importSessions(files: { name: string; text: string }[]): Promise<ImportResult>;
  resetDemo?: () => Promise<void>;
  clearAll?: () => Promise<void>;
}

const Ctx = createContext<DataState | null>(null);

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
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<DataState>(() => {
    const studentByCode = new Map(students.map((s) => [s.codigoParticipante.toUpperCase(), s]));
    const after = async <T,>(p: Promise<T>) => {
      const r = await p;
      await reload();
      return r;
    };
    return {
      loading,
      error,
      students,
      sessions,
      studentByCode,
      reload,
      createStudent: (i) => after(repository.createStudent(i)),
      updateStudent: (id, i) => after(repository.updateStudent(id, i)),
      deleteStudent: (id) => after(repository.deleteStudent(id)),
      deleteSession: (id) => after(repository.deleteSession(id)),
      importSessions: (f) => after(repository.importSessions(f)),
      resetDemo: repository.resetDemo ? () => after(repository.resetDemo!()) : undefined,
      clearAll: repository.clearAll ? () => after(repository.clearAll!()) : undefined,
    };
  }, [students, sessions, loading, error, reload]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData debe usarse dentro de <DataProvider>');
  return v;
}
