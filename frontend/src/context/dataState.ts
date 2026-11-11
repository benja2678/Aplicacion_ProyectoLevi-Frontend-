// Forma de los datos del panel y el hook para leerlos (el componente está en DataProvider.tsx).

import { createContext, useContext } from 'react';
import type { ImportResult, SessionFile, StoredSession, Student, StudentInput } from '../types';

export interface DataState {
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
  importSessions(files: SessionFile[]): Promise<ImportResult>;
  /** Solo en la demo local. */
  clearAll?: () => Promise<void>;
}

export const DataCtx = createContext<DataState | null>(null);

export function useData(): DataState {
  const v = useContext(DataCtx);
  if (!v) throw new Error('useData debe usarse dentro de <DataProvider>');
  return v;
}
