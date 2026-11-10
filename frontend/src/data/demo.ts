// Datos de demostración con el MISMO formato que genera SessionLogger.cs en Unity.
// Sirven para probar la interfaz sin visor ni base de datos. Son deterministas
// (semilla fija), así que se ven igual en cada recarga.

import type { SessionEvent, SessionLog, StoredSession, Student, TaskSummary } from '../types';
import { DEFAULT_SUBJECT, EXPERIMENTS } from './catalog';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const EXPECTED: Record<string, Record<string, number>> = {
  T0: { V_R1: 2.912 },
  N1: { V1: 6.0, V2: 3.6, V3: 2.4, I_total: 0.012, I_R2: 0.0072, I_R4: 0.0048 },
  N1D: { V1: 6.0, V2: 3.6, V3: 2.4, I_total: 0.012, I_R2: 0.0072, I_R4: 0.0048 },
  N2: { V_R1: 4.2, V_R2: 2.8, V_R3: 1.4, I_R1: 0.0089, I_R2: 0.006, I_R3: 0.0029 },
};

const PIECES: Record<string, string[]> = {
  T0: ['Componentes/R1', 'Componentes/D1', 'Cables/Cable_Rojo', 'Cables/Cable_Negro'],
  N1: ['Cables/Cable_Rojo', 'Cables/Cable_Negro'],
  N1D: ['Componentes/R1', 'Componentes/R2', 'Componentes/R3', 'Componentes/R4', 'Cables/Cable_Rojo', 'Cables/Cable_Negro', 'Cables/Puente_1', 'Cables/Puente_2'],
  N2: ['Componentes/R1', 'Componentes/R2', 'Componentes/R3', 'Cables/Cable_Rojo', 'Cables/Cable_Negro', 'Cables/Puente_1'],
};

const TUTORIAL_STEPS = ['comenzar', 'tomar', 'resistencia', 'led', 'circuito', 'selector', 'medir', 'registrar', 'borne10A', 'borneVOmA'];
const REJECTS = ['WrongMode', 'OverRange', 'RedProbeDisconnected', 'BlackProbeDisconnected', 'ProbesDisconnected', 'MeterOff'];
const ISSUES: [string, string][] = [
  ['ShortCircuit', 'Corriente muy superior a la esperable entre F1+ y F1-.'],
  ['OpenCircuit', 'Hay fuente conectada pero no circula corriente.'],
  ['DanglingTerminal', 'Una pata de R3 no comparte nodo con ninguna otra.'],
  ['ExcessivePower', 'R1 disipa más potencia de la que soporta.'],
  ['LedReverseBiased', 'D1 está polarizado en inversa.'],
];

function pad(n: number) {
  return n.toString().padStart(2, '0');
}
function isoLocal(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function ev(t: number, type: string, task = '', detail = '', extra: Partial<SessionEvent> = {}): SessionEvent {
  return { t: Math.round(t * 100) / 100, type, task, detail, measured: 0, expected: 0, verdict: '', attempt: 0, selector: '', jack: '', ...extra };
}

function buildSession(code: string, expId: string, start: Date, skill: number, rand: () => number): SessionLog {
  const exp = EXPERIMENTS.find((e) => e.id === expId)!;
  const events: SessionEvent[] = [];
  let t = 0;
  const step = (min: number, max: number) => (t += min + rand() * (max - min));

  events.push(ev(0, 'etapa', '', 'Briefing'));
  events.push(ev(step(1, 3), 'recentrado', '', 'inicio'));
  events.push(ev(step(15, 70 - skill * 30), 'etapa', '', 'Laboratory'));

  if (expId === 'T0') {
    for (const s of TUTORIAL_STEPS) events.push(ev(step(6, 40 - skill * 20), 'tutorial', s, 'cumplido'));
  }

  // Armado: tomas y sueltas de piezas.
  for (const piece of PIECES[expId]) {
    let tries = 0;
    while (true) {
      tries++;
      events.push(ev(step(3, 12), 'toma', '', piece));
      const ok = rand() < 0.45 + skill * 0.5 || tries >= 4;
      events.push(ev(step(2, 9), 'suelta', '', `${piece}:${ok ? 'conectada' : 'sin conectar'}`));
      if (ok) break;
    }
  }
  if (rand() < 0.5) events.push(ev(step(2, 6), 'vista', '', 'conexiones:on'));

  // Diagnósticos del circuito durante el armado.
  if (rand() > skill * 0.9) {
    const [k, msg] = ISSUES[Math.floor(rand() * (expId === 'T0' ? ISSUES.length : ISSUES.length - 1))];
    events.push(ev(step(1, 4), 'diagnostico', '', `${k}: ${msg}`));
  }
  if (rand() > skill + 0.2) {
    events.push(ev(step(1, 4), 'diagnostico', '', `${ISSUES[1][0]}: ${ISSUES[1][1]}`));
  }

  events.push(ev(step(1, 3), 'toma', '', 'Multimetro/multimetro'));
  events.push(ev(step(1, 3), 'selector', '', '20 V'));
  if (rand() < 0.4) events.push(ev(step(2, 6), 'vista', '', 'corriente:on'));

  const tasks: TaskSummary[] = [];
  let correctCount = 0;
  const abandoned = rand() < 0.08 + (1 - skill) * 0.12;
  const taskList = abandoned ? exp.tasks.slice(0, Math.max(1, Math.floor(exp.tasks.length / 2))) : exp.tasks;

  for (const taskId of exp.tasks) {
    const summary: TaskSummary = { id: taskId, attempts: 0, rejected: 0, finalVerdict: 'SinRegistrar', firstCorrectAttempt: 0, firstReadingSeconds: -1, firstCorrectSeconds: -1 };
    tasks.push(summary);
    if (!taskList.includes(taskId)) continue;

    const isCurrent = taskId.startsWith('I');
    const selector = isCurrent ? '20m/10A' : '20 V';
    const jack = isCurrent && rand() < 0.15 ? 'TenAmp' : 'VoltOhmMilliamp';
    events.push(ev(step(5, 25), 'selector', '', selector));
    if (isCurrent && jack === 'TenAmp') events.push(ev(step(1, 3), 'borne', '', 'TenAmp'));

    const nRejects = rand() < 1 - skill ? 1 + Math.floor(rand() * 2) : 0;
    for (let i = 0; i < nRejects; i++) {
      events.push(ev(step(3, 15), 'rechazo', taskId, REJECTS[Math.floor(rand() * REJECTS.length)], { selector: rand() < 0.5 ? '2 V' : selector, jack }));
      summary.rejected++;
    }

    const expected = EXPECTED[expId][taskId];
    let verdict = '';
    // Los alumnos con menos dominio se rinden antes con una tarea difícil.
    const maxAttempts = rand() < skill ? 4 : 2;
    while (summary.attempts < maxAttempts) {
      summary.attempts++;
      const r = rand();
      if (r < skill * 0.85) verdict = 'Correct';
      else if (r < skill * 0.85 + 0.15) verdict = 'ReversedPolarity';
      else verdict = 'OutOfTolerance';

      let measured = expected * (1 + (rand() - 0.5) * 0.02);
      if (verdict === 'ReversedPolarity') measured = -measured;
      if (verdict === 'OutOfTolerance') measured = expected * (rand() < 0.5 ? 0.6 + rand() * 0.25 : 1.2 + rand() * 0.5);
      measured = Math.round(measured * (isCurrent ? 100000 : 1000)) / (isCurrent ? 100000 : 1000);

      events.push(ev(step(6, 30), 'lectura', taskId, '', { measured, expected, verdict, attempt: summary.attempts, selector, jack }));
      if (summary.firstReadingSeconds < 0) summary.firstReadingSeconds = events[events.length - 1].t;
      if (verdict === 'Correct') {
        summary.firstCorrectAttempt = summary.attempts;
        summary.firstCorrectSeconds = events[events.length - 1].t;
        break;
      }
    }
    summary.finalVerdict = verdict;
    if (verdict === 'Correct') correctCount++;
  }

  if (rand() < 0.25) events.push(ev(step(3, 10), 'recentrado', '', 'manual'));
  if (rand() < 0.3) events.push(ev(step(2, 6), 'vista', 'pizarra', 'Esquemático'));

  const completed = !abandoned;
  const duration = step(5, 20);
  let labStart = 0;
  let labEnd = duration;
  if (completed) events.push(ev(duration, 'etapa', '', 'Results'));
  for (const e of events) if (e.type === 'etapa' && e.detail === 'Laboratory') labStart = e.t;
  if (completed) labEnd = duration;

  const finished = new Date(start.getTime() + duration * 1000);
  return {
    participantCode: code,
    experimentId: exp.id,
    experimentTitle: exp.title,
    appVersion: '0.9.3',
    device: 'Oculus Quest 3S',
    startedAt: isoLocal(start),
    finishedAt: isoLocal(finished),
    completed,
    durationSeconds: Math.round(duration * 100) / 100,
    laboratorySeconds: Math.round((labEnd - labStart) * 100) / 100,
    correctCount,
    taskCount: exp.tasks.length,
    events,
    tasks,
  };
}

export function sessionId(log: SessionLog): string {
  return `${log.participantCode}_${log.experimentId}_${log.startedAt}`;
}

const DEMO_STUDENTS: [string, string, number][] = [
  ['Camila Rojas', 'A001', 0.85],
  ['Matías González', 'A002', 0.55],
  ['Valentina Muñoz', 'A003', 0.7],
  ['Benjamín Díaz', 'B001', 0.4],
  ['Fernanda Vargas', 'B002', 0.9],
  ['Tomás Contreras', 'B003', 0.62],
];

export function buildDemoData(): { students: Student[]; sessions: StoredSession[] } {
  const rand = rng(20261106);
  const base = new Date(2026, 9, 14, 9, 0, 0);
  const students: Student[] = DEMO_STUDENTS.map(([nombre, code], i) => ({
    id: `demo-${i + 1}`,
    nombre,
    asignatura: DEFAULT_SUBJECT,
    codigoParticipante: code,
    creadoEn: isoLocal(new Date(base.getTime() - 86400000 * 2)),
  }));

  const sessions: StoredSession[] = [];
  const plan = ['T0', 'N1', 'N2', 'N1D'];
  DEMO_STUDENTS.forEach(([, code, skill], i) => {
    const n = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const day = k * 6 + (code.startsWith('B') ? 2 : 0) + Math.floor(rand() * 2);
      const start = new Date(base.getTime() + day * 86400000 + (i * 25 + Math.floor(rand() * 20)) * 60000);
      const log = buildSession(code, plan[k], start, Math.min(0.95, skill + k * 0.04), rand);
      sessions.push({ id: sessionId(log), log, source: 'demo', receivedAt: log.finishedAt });
    }
  });

  // Sesión de un código que aún no está asociado a ningún alumno.
  const orphan = buildSession('A004', 'T0', new Date(2026, 10, 4, 11, 12, 0), 0.6, rand);
  sessions.push({ id: sessionId(orphan), log: orphan, source: 'demo', receivedAt: orphan.finishedAt });

  return { students, sessions };
}
