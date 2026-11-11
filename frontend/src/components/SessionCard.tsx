import { useState } from 'react';
import { experimentTitle, VERDICT_LABELS } from '../domain/catalog';
import { fmtDateTime, fmtDuration } from '../utils/format';
import { computeMetrics } from '../domain/metrics';
import type { StoredSession } from '../types';
import { Badge, Icon } from './ui';

function verdictTone(v: string) {
  if (v === 'Correct') return 'good' as const;
  if (v === 'SinRegistrar') return 'neutral' as const;
  if (v === 'ReversedPolarity') return 'warn' as const;
  return 'bad' as const;
}

/**
 * Una sesión: 4 datos a la vista y el detalle al hacer clic.
 * Si se pasa `onDelete`, el detalle muestra el botón para eliminarla (la confirmación la hace quien la usa).
 */
export function SessionCard({ session, onDelete }: { session: StoredSession; onDelete?: (session: StoredSession) => void }) {
  const [open, setOpen] = useState(false);
  const log = session.log;
  const m = computeMetrics(log);
  const allCorrect = m.taskCount > 0 && m.tasksCorrect === m.taskCount;

  return (
    <div className="card session" data-open={open}>
      <button className="session-main" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div>
          <div className="session-title">{experimentTitle(log.experimentId, log.experimentTitle)}</div>
          <div className="session-sub">
            {fmtDateTime(log.startedAt)}
            {!m.completed && <Badge tone="warn">No terminó</Badge>}
          </div>
        </div>
        <div className="metric">
          <div className="metric-value">{m.durationSeconds < 60 ? '<1 min' : `${Math.round(m.durationSeconds / 60)} min`}</div>
          <div className="metric-label">Tiempo</div>
        </div>
        <div className="metric">
          <div className="metric-value">{m.readings}</div>
          <div className="metric-label">Mediciones</div>
        </div>
        <div className={`metric ${allCorrect ? 'good' : ''}`}>
          <div className="metric-value">
            {m.tasksCorrect}/{m.taskCount}
          </div>
          <div className="metric-label">Correctas</div>
        </div>
        <div className={`metric ${m.errors > 0 ? 'bad' : 'good'}`}>
          <div className="metric-value">{m.errors}</div>
          <div className="metric-label">Errores</div>
        </div>
        <span className="chev">
          <Icon name="chevron" size={18} />
        </span>
      </button>

      {open && (
        <div className="session-detail">
          <div>
            <h3>Resultado por medición</h3>
            <table className="mini-table">
              <tbody>
                {m.tasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className="code">{t.id}</span>
                    </td>
                    <td>
                      <Badge tone={verdictTone(t.finalVerdict)}>{VERDICT_LABELS[t.finalVerdict] ?? t.finalVerdict}</Badge>
                    </td>
                    <td>{t.attempts === 1 ? '1 intento' : `${t.attempts} intentos`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3>De dónde vienen los errores</h3>
            <table className="mini-table">
              <tbody>
                <tr>
                  <td>Mediciones con valor incorrecto</td>
                  <td>{m.wrongReadings}</td>
                </tr>
                <tr>
                  <td>Multímetro mal usado</td>
                  <td>{m.rejections}</td>
                </tr>
                <tr>
                  <td>Fallas en el circuito (cortos, sobrecarga)</td>
                  <td>{m.circuitFaults}</td>
                </tr>
                <tr>
                  <td>Tiempo exacto</td>
                  <td>{fmtDuration(m.durationSeconds)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {onDelete && (
            <div className="session-actions">
              <button className="btn btn-quiet btn-danger" onClick={() => onDelete(session)}>
                <Icon name="trash" /> Eliminar sesión
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
