// Elige de dónde salen los datos según VITE_DATA_SOURCE (.env.dev / .env.prod):
//   api   -> backend Django (con login del lector: docente o equipo)
//   local -> demo en el navegador, sin login (cualquier otro valor o sin definir)

import { config } from '../config';
import { createApiRepository } from './apiRepository';
import { createLocalRepository } from './localRepository';
import type { Repository } from './Repository';

export const DATA_SOURCE = config.dataSource;

export const repository: Repository = DATA_SOURCE === 'api' ? createApiRepository() : createLocalRepository();

export type { Repository } from './Repository';
