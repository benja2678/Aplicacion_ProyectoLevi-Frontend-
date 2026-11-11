// Contrato de la capa de datos.
//
// Las pantallas solo conocen este contrato (a través de context/DataProvider), nunca la API ni
// localStorage. Hay dos implementaciones: apiRepository (backend Django) y
// localRepository (demo sin servidor). Todo es async para que sean intercambiables.

import type { ImportResult, SessionFile, StoredSession, Student, StudentInput } from '../types';

export interface Repository {
  listStudents(): Promise<Student[]>;
  createStudent(input: StudentInput): Promise<Student>;
  updateStudent(id: string, input: StudentInput): Promise<Student>;
  deleteStudent(id: string): Promise<void>;

  listSessions(): Promise<StoredSession[]>;
  deleteSession(id: string): Promise<void>;
  /** Sube sesiones exportadas del visor (archivos .json de la carpeta "sesiones"). */
  importSessions(files: SessionFile[]): Promise<ImportResult>;

  /** Solo en la demo local: borra los datos de ejemplo. */
  clearAll?(): Promise<void>;
}
