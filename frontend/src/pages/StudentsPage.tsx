import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentForm } from '../components/StudentForm';
import { Icon } from '../components/ui';
import { useData } from '../context/dataState';
import { fullName, normalizeCode, orphanCodes, searchStudents, sessionStatsByCode } from '../domain/students';
import type { Student } from '../types';
import { fmtDate } from '../utils/format';

export function StudentsPage() {
  const { students, sessions, studentByCode, deleteStudent, clearAll } = useData();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const stats = useMemo(() => sessionStatsByCode(sessions), [sessions]);
  const orphans = orphanCodes(stats, studentByCode);
  const list = searchStudents(students, query);

  const open = (s: Student) => navigate(`/alumno/${encodeURIComponent(s.id)}`);

  async function remove(s: Student) {
    if (confirm(`¿Eliminar a ${fullName(s)}? Sus sesiones no se borran.`)) await deleteStudent(s.id);
  }

  return (
    <>
      <div className="page-title">
        <h1>Alumnos</h1>
        <p>Agrega a cada alumno y revisa cómo le fue en el laboratorio virtual.</p>
      </div>

      <section className="card card-pad">
        <h2 style={{ marginBottom: 14 }}>Agregar alumno</h2>
        <StudentForm />
      </section>

      {orphans.length > 0 && (
        <div className="notice">
          <span>
            El visor tiene sesiones del código <strong>{orphans.join(', ')}</strong>, que aún no es de ningún alumno. Agrégalo con ese código para ver sus resultados.
          </span>
        </div>
      )}

      <section className="card">
        <div className="list-head">
          <h2>
            {students.length} {students.length === 1 ? 'alumno' : 'alumnos'}
          </h2>
          {students.length > 4 && (
            <div className="search">
              <Icon name="search" />
              <input className="input" placeholder="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar alumno" />
            </div>
          )}
        </div>

        {students.length === 0 ? (
          <div className="empty">
            <strong>Aún no hay alumnos</strong>
            Usa el formulario de arriba para agregar el primero.
          </div>
        ) : list.length === 0 ? (
          <div className="empty">Ningún alumno coincide con “{query}”.</div>
        ) : (
          <>
            <div className="col-head">
              <span>Nombre</span>
              <span>Código</span>
              <span>Sesiones</span>
              <span>Última sesión</span>
              <span />
            </div>
            {list.map((s) => {
              const st = stats.get(normalizeCode(s.codigoParticipante));
              return (
                <div key={s.id} className="row-link" role="link" tabIndex={0} onClick={() => open(s)} onKeyDown={(e) => e.key === 'Enter' && open(s)}>
                  <span>
                    <span className="row-name">{fullName(s)}</span>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {s.asignatura}
                    </div>
                  </span>
                  <span>
                    <span className="code">{s.codigoParticipante}</span>
                  </span>
                  <span className="hide-sm">{st ? st.count : <span className="muted">0</span>}</span>
                  <span className="hide-sm">{st ? fmtDate(st.last) : <span className="muted">Sin sesiones</span>}</span>
                  <button
                    className="btn btn-quiet btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      void remove(s);
                    }}
                    aria-label={`Eliminar a ${fullName(s)}`}
                    title="Eliminar"
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              );
            })}
          </>
        )}
      </section>

      {clearAll && sessions.some((s) => s.source === 'demo') && (
        <p className="hint" style={{ margin: 0, textAlign: 'center' }}>
          Estás viendo datos de ejemplo.{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (confirm('¿Borrar los alumnos y sesiones de ejemplo para empezar en limpio?')) void clearAll();
            }}
          >
            Borrarlos y empezar en limpio
          </a>
        </p>
      )}
    </>
  );
}
