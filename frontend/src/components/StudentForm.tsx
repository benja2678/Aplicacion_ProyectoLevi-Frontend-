import { useMemo, useState, type FormEvent } from 'react';
import { useData } from '../context/dataState';
import { DEFAULT_SUBJECT, SUBJECTS } from '../domain/catalog';
import { nextFreeCode, normalizeCode } from '../domain/students';
import type { Student } from '../types';
import { Icon } from './ui';

/**
 * Formulario de una sola línea: nombre, apellido, asignatura y código.
 * Sin `student` agrega uno nuevo; con `student` lo edita.
 * `onDone` recibe el alumno guardado (con la API, su id cambia si cambió el código).
 */
export function StudentForm({ student, onDone }: { student?: Student; onDone?: (saved: Student) => void }) {
  const { students, createStudent, updateStudent } = useData();
  const taken = useMemo(
    () => new Set(students.filter((s) => s.id !== student?.id).map((s) => normalizeCode(s.codigoParticipante))),
    [students, student],
  );

  const [nombre, setNombre] = useState(student?.nombre ?? '');
  const [apellido, setApellido] = useState(student?.apellido ?? '');
  const [asignatura, setAsignatura] = useState(student?.asignatura ?? DEFAULT_SUBJECT);
  const [codigo, setCodigo] = useState(student?.codigoParticipante ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Para un alumno nuevo se propone el siguiente código libre.
  const suggested = student ? '' : nextFreeCode(taken);
  const code = normalizeCode(codigo || suggested);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return setError('Escribe el nombre del alumno.');
    if (!code) return setError('Escribe el código del visor.');
    if (taken.has(code)) return setError(`El código ${code} ya es de otro alumno.`);
    setSaving(true);
    setError(null);
    try {
      const data = { nombre, apellido, asignatura, codigoParticipante: code };
      const saved = student ? await updateStudent(student.id, data) : await createStudent(data);
      setNombre('');
      setApellido('');
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
        <label htmlFor="sf-nombre">Nombre</label>
        <input id="sf-nombre" className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Camila" autoComplete="off" autoFocus={!!student} />
      </div>
      <div className="field">
        <label htmlFor="sf-apellido">Apellido</label>
        <input id="sf-apellido" className="input" value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Ej. Rojas" autoComplete="off" />
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
          placeholder={suggested}
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
