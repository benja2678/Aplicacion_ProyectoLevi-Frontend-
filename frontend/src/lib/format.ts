/** 367 -> "6 min 07 s" */
export function fmtDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h) return `${h} h ${m.toString().padStart(2, '0')} min`;
  if (m) return `${m} min ${r.toString().padStart(2, '0')} s`;
  return `${r} s`;
}

/** Unity guarda la hora local sin zona ("2026-11-05T10:31:12"). */
function parseLocal(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDateTime(iso: string): string {
  const d = parseLocal(iso);
  if (!d) return '—';
  return d.toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(iso: string): string {
  const d = parseLocal(iso);
  if (!d) return '—';
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}
