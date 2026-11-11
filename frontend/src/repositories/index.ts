// Elige de dónde salen los datos según VITE_DATA_SOURCE:
//   api   -> backend Django (con login del lector: docente o equipo)
//   local -> demo en el navegador, sin login (cualquier otro valor o sin definir)

import { createApiRepository } from './apiRepository';
import { createLocalRepository } from './localRepository';
import type { Repository } from './Repository';

export type DataSource = 'local' | 'api';
export const DATA_SOURCE: DataSource = import.meta.env.VITE_DATA_SOURCE === 'api' ? 'api' : 'local';

export const repository: Repository = DATA_SOURCE === 'api' ? createApiRepository() : createLocalRepository();

export type { Repository } from './Repository';
