import { useRef, useState } from 'react';
import { useData } from '../data/DataContext';
import type { ImportResult } from '../data/repository';
import { Icon, Modal } from './ui';

/**
 * Carga los .json que el visor guarda en Android/data/<paquete>/files/sesiones/.
 * Con el envío automático de Unity al backend funcionando, esto queda como respaldo.
 */
export function ImportDialog({ onClose }: { onClose: () => void }) {
  const { importSessions } = useData();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const list = await Promise.all(
        [...files].filter((f) => f.name.toLowerCase().endsWith('.json')).map(async (f) => ({ name: f.name, text: await f.text() })),
      );
      setResult(await importSessions(list));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Cargar sesiones del visor"
      onClose={onClose}
      footer={
        <button className="btn btn-primary" onClick={onClose}>
          Listo
        </button>
      }
    >
      <div
        className={`dropzone ${over ? 'over' : ''}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void handle(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
      >
        <Icon name="upload" size={24} />
        <div style={{ marginTop: 8, fontWeight: 550, color: 'var(--text)' }}>{busy ? 'Cargando…' : 'Arrastra aquí los archivos .json'}</div>
        <div className="hint">o haz clic para elegirlos</div>
        <input ref={input} type="file" accept=".json,application/json" multiple hidden onChange={(e) => void handle(e.target.files)} />
      </div>

      {error && (
        <p className="error" role="alert" style={{ marginBottom: 0 }}>
          No se pudieron cargar: {error}
        </p>
      )}
      {result && !error && (
        <p style={{ marginBottom: 0 }}>
          <strong>{result.added}</strong> {result.added === 1 ? 'sesión nueva' : 'sesiones nuevas'}
          {result.duplicated > 0 && <span className="muted"> · {result.duplicated} ya estaban</span>}
          {result.invalid.length > 0 && <span className="error"> · {result.invalid.length} archivo(s) no válidos</span>}
        </p>
      )}
      <p className="hint" style={{ marginBottom: 0 }}>
        En el Meta Quest están en Android/data/&lt;app&gt;/files/sesiones (se copian con Meta Quest Developer Hub).
      </p>
    </Modal>
  );
}
