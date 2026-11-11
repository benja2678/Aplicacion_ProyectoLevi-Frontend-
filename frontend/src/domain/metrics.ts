import { SERIOUS_ISSUES } from './catalog';
import type { SessionEvent, SessionLog, StoredSession, TaskSummary } from '../types';

/** Lo esencial de una sesión. */
export interface SessionMetrics {
  durationSeconds: number;
  completed: boolean;
  /** lecturas registradas con el multímetro */
  readings: number;
  tasksCorrect: number;
  taskCount: number;
  /** errores = lecturas incorrectas + registros rechazados + fallas del circuito */
  errors: number;
  wrongReadings: number;
  rejections: number;
  circuitFaults: number;
  tasks: TaskSummary[];
}

/**
 * Si la sesión se cortó antes de terminar (visor apagado), `tasks` viene vacío:
 * se reconstruye a partir de los eventos.
 */
function tasksFromEvents(events: SessionEvent[]): TaskSummary[] {
  const map = new Map<string, TaskSummary>();
  for (const e of events) {
    if (!e.task || (e.type !== 'lectura' && e.type !== 'rechazo')) continue;
    let s = map.get(e.task);
    if (!s) {
      s = { id: e.task, attempts: 0, rejected: 0, finalVerdict: 'SinRegistrar', firstCorrectAttempt: 0, firstReadingSeconds: -1, firstCorrectSeconds: -1 };
      map.set(e.task, s);
    }
    if (e.type === 'rechazo') s.rejected++;
    else {
      s.attempts++;
      s.finalVerdict = e.verdict;
    }
  }
  return [...map.values()];
}

export function computeMetrics(log: SessionLog): SessionMetrics {
  const events = log.events ?? [];
  const tasks = log.tasks?.length ? log.tasks : tasksFromEvents(events);

  let readings = 0;
  let wrongReadings = 0;
  let rejections = 0;
  let circuitFaults = 0;
  for (const e of events) {
    if (e.type === 'lectura') {
      readings++;
      if (e.verdict !== 'Correct') wrongReadings++;
    } else if (e.type === 'rechazo') rejections++;
    else if (e.type === 'diagnostico') {
      const kind = e.detail.split(':')[0].trim();
      if (SERIOUS_ISSUES.has(kind)) circuitFaults++;
    }
  }

  return {
    durationSeconds: log.durationSeconds || (events.length ? events[events.length - 1].t : 0),
    completed: log.completed,
    readings,
    tasksCorrect: tasks.filter((t) => t.finalVerdict === 'Correct').length,
    taskCount: log.taskCount || tasks.length,
    errors: wrongReadings + rejections + circuitFaults,
    wrongReadings,
    rejections,
    circuitFaults,
    tasks,
  };
}

export function sortByDateDesc(list: StoredSession[]): StoredSession[] {
  return [...list].sort((a, b) => b.log.startedAt.localeCompare(a.log.startedAt));
}
