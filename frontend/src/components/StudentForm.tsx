import { useMemo, useState, type FormEvent } from 'react';
import { DEFAULT_SUBJECT, SUBJECTS } from '../data/catalog';
import { useData } from '../data/DataContext';
import type { Student } from '../types';
import { Icon } from './ui';

/** Siguiente código libre: A001, A002... */
function nextCode(taken: Set<string>): string {
  for (let i = 1; i < 1000; i++) {
    const c = `A${i.toString().padStart(3, '0')}`;
    if (!taken.has(c)) return c;
  }
  return '';
}

/**
 * Formulario de una sola línea: nombre, asignatura y código.
 * Sin `student` agrega uno nuevo; con `student` lo edita.
 */
export function StudentForm({ student, onDone }: { student?: Student; onDone?: (saved: Student) => void }) {
  const { students, createStudent, updateStudent } = useData();
  const taken = useMemo(
    () => new Set(students.filter((s) => s.id !== student?.id).map((s) => s.codigoParticipante.toUpperCase())),
    [students, student],
  );

  const [nombre, setNombre] = useState(student?.nombre ?? '');
  const [asignatura, setAsignatura] = useState(student?.asignatura ?? DEFAULT_SUBJECT);
  const [codigo, setCodigo] = useState(student?.codigoParticipante ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Para un alumno nuevo se propone el siguiente código libre.
  const code = (codigo || (student ? '' : nextCode(taken))).trim().toUpperCase();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return setError('Escribe el nombre del alumno.');
    if (!code) return setError('Escribe el código del visor.');
    if (taken.has(code)) return setError(`El código ${code} ya es de otro alumno.`);
    setSaving(true);
    setError(null);
    try {
      const data = { nombre, asignatura, codigoParticipante: code };
      const saved = student ? await updateStudent(student.id, data) : await createStudent(data);
      setNombre('');
      setCodigo('');
      onDone?.(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const subjects = SUBJECTS.includes(asignatura) ? SUBJECTS : [...SUBJECTS, asignatura];

  return (
    <form className="student-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="sf-nombre">Nombre del alumno</label>
        <input id="sf-nombre" className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Camila Rojas" autoComplete="off" autoFocus={!!student} />
      </div>
      <div className="field">
        <label htmlFor="sf-asig">Asignatura</label>
        <select id="sf-asig" className="select" value={asignatura} onChange={(e) => setAsignatura(e.target.value)}>
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="sf-codigo">Código</label>
        <input
          id="sf-codigo"
          className="input"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder={student ? '' : nextCode(taken)}
          autoComplete="off"
        />
      </div>
      <button className="btn btn-primary" type="submit" disabled={saving}>
        {student ? 'Guardar' : (
          <>
            <Icon name="plus" /> Agregar
          </>
        )}
      </button>
      {error ? <div className="error">{error}</div> : <div className="hint">El código es el que muestra el visor en su menú (A001, B002…). Une al alumno con sus resultados.</div>}
    </form>
  );
}
