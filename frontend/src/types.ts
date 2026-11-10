// Tipos que reflejan EXACTAMENTE el JSON que genera Unity
// (Assets/_Project/Runtime/CircuitBridge/Experiments/SessionLog.cs).
// Si cambia SessionLog.cs, hay que actualizar esto.

/** Tipos de evento (EventTypes en SessionLog.cs). */
export type EventType =
  | 'etapa'
  | 'lectura'
  | 'rechazo'
  | 'toma'
  | 'suelta'
  | 'diagnostico'
  | 'selector'
  | 'borne'
  | 'vista'
  | 'tutorial'
  | 'recentrado';

export type Verdict = 'Correct' | 'ReversedPolarity' | 'OutOfTolerance';
export type FinalVerdict = Verdict | 'SinRegistrar';
export type Phase = 'Briefing' | 'Laboratory' | 'Results';
export type RejectReason =
  | 'WrongPhase'
  | 'MeterOff'
  | 'WrongMode'
  | 'ProbesDisconnected'
  | 'RedProbeDisconnected'
  | 'BlackProbeDisconnected'
  | 'OverRange';

export interface SessionEvent {
  /** segundos desde el inicio de la sesión */
  t: number;
  type: EventType | string;
  task: string;
  detail: string;
  measured: number;
  expected: number;
  verdict: string;
  attempt: number;
  selector: string;
  jack: string;
}

export interface TaskSummary {
  id: string;
  attempts: number;
  rejected: number;
  finalVerdict: FinalVerdict | string;
  firstCorrectAttempt: number;
  firstReadingSeconds: number;
  firstCorrectSeconds: number;
}

export interface SessionLog {
  participantCode: string;
  experimentId: string;
  experimentTitle: string;
  appVersion: string;
  device: string;
  /** ISO 8601, hora local (sin zona) */
  startedAt: string;
  finishedAt: string;
  completed: boolean;
  durationSeconds: number;
  laboratorySeconds: number;
  correctCount: number;
  taskCount: number;
  events: SessionEvent[];
  tasks: TaskSummary[];
}

// ------------------------------------------------------------------ //
// Datos propios de la aplicación web

export interface Student {
  id: string;
  /** nombre completo */
  nombre: string;
  asignatura: string;
  /** Código que muestra el visor (A001, B002...). Une al alumno con sus sesiones. */
  codigoParticipante: string;
  creadoEn: string;
}

export type StudentInput = Omit<Student, 'id' | 'creadoEn'>;

export type SessionSource = 'demo' | 'importada' | 'visor';

export interface StoredSession {
  /** participantCode_experimentId_startedAt: misma unicidad que espera el envío de Unity */
  id: string;
  log: SessionLog;
  source: SessionSource;
  receivedAt: string;
}
