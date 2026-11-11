// Repositorio del backend Django: delega en la capa api/.

import { sessionsApi } from '../api/sessionsApi';
import { studentsApi } from '../api/studentsApi';
import { normalizeStudentInput } from '../domain/students';
import type { Repository } from './Repository';

export function createApiRepository(): Repository {
  return {
    listStudents: studentsApi.list,
    createStudent: (input) => studentsApi.create(normalizeStudentInput(input)),
    updateStudent: (id, input) => studentsApi.update(id, normalizeStudentInput(input)),
    deleteStudent: studentsApi.remove,

    listSessions: sessionsApi.list,
    deleteSession: sessionsApi.remove,
    importSessions: sessionsApi.importFiles,
  };
}
