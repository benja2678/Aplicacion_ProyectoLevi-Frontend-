import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SessionCard } from '../components/SessionCard';
import { StudentForm } from '../components/StudentForm';
import { Icon, Modal } from '../components/ui';
import { useData } from '../data/DataContext';
import { fmtDuration } from '../lib/format';
import { sortByDateDesc } from '../lib/metrics';

export function StudentPage() {
  const { id } = useParams();
  const { students, sessions, deleteStudent, loading } = useData();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const student = students.find((s) => s.id === id);

  if (!student) {
    if (loading) return null;
    return (
      <div className="empty">
        <strong>No se encontró el alumno</strong>
        <Link to="/">Volver a la lista</Link>
      </div>
    );
  }

  const own = sortByDateDesc(sessions.filter((s) => s.log.participantCode.toUpperCase() === student.codigoParticipante.toUpperCase()));
  const totalTime = own.reduce((a, s) => a + (s.log.durationSeconds || 0), 0);

  async function remove() {
    if (!student || !confirm(`¿Eliminar a ${student.nombre}? Sus sesiones no se borran.`)) return;
    await deleteStudent(student.id);
    navigate('/');
  }

  return (
    <>
      <Link to="/" className="back">
        <Icon name="back" /> Alumnos
      </Link>

      <div className="student-head">
        <div>
          <h1>{student.nombre}</h1>
          <p>
            <span className="code">{student.codigoParticipante}</span> · {student.asignatura}
            {own.length > 0 && ` · ${own.length} ${own.length === 1 ? 'sesión' : 'sesiones'}, ${fmtDuration(totalTime)} en total`}
          </p>
        </div>
        <div className="actions">
          <button className="btn" onClick={() => setEditing(true)}>
            <Icon name="edit" /> Editar
          </button>
          <button className="btn btn-quiet btn-danger" onClick={() => void remove()}>
            <Icon name="trash" /> Eliminar
          </button>
        </div>
      </div>

      {own.length === 0 ? (
        <div className="card empty">
          <strong>Todavía no tiene sesiones</strong>
          Aparecerán aquí cuando use el visor con el código <span className="code">{student.codigoParticipante}</span>.
        </div>
      ) : (
        <>
          <p className="hint" style={{ margin: 0 }}>
            Haz clic en una sesión para ver el detalle.
          </p>
          {own.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </>
      )}

      {editing && (
        <Modal title="Editar alumno" onClose={() => setEditing(false)}>
          <StudentForm student={student} onDone={() => setEditing(false)} />
        </Modal>
      )}
    </>
  );
}
