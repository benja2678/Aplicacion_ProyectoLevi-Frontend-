// Alumnos: /api/students/
// El id de un alumno es su código de visor (si se cambia el código, cambia el id).

import type { Student, StudentInput } from '../types';
import { http, withId } from './http';

const BASE = '/students/';

export const studentsApi = {
  list: () => http.get<Student[]>(BASE),
  create: (input: StudentInput) => http.post<Student>(BASE, input),
  update: (id: string, input: StudentInput) => http.put<Student>(withId(BASE, id), input),
  remove: (id: string) => http.delete(withId(BASE, id)),
};
