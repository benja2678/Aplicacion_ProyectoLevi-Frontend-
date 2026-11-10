import { useState } from 'react';
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { ImportDialog } from './components/ImportDialog';
import { Icon } from './components/ui';
import { DataProvider } from './data/DataContext';
import { StudentPage } from './pages/StudentPage';
import { StudentsPage } from './pages/StudentsPage';

export default function App() {
  const [importing, setImporting] = useState(false);

  return (
    <DataProvider>
      <HashRouter>
        <header className="topbar">
          <div className="topbar-inner">
            <Link to="/" className="brand">
              <span className="brand-mark">
                <Icon name="chip" size={18} />
              </span>
              <span>
                Laboratorio VR
                <small>Electrónica Digital</small>
              </span>
            </Link>
            <button className="btn" onClick={() => setImporting(true)} title="Cargar sesiones del visor">
              <Icon name="upload" /> <span>Cargar sesiones</span>
            </button>
          </div>
        </header>

        <main className="container">
          <Routes>
            <Route path="/" element={<StudentsPage />} />
            <Route path="/alumno/:id" element={<StudentPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {importing && <ImportDialog onClose={() => setImporting(false)} />}
      </HashRouter>
    </DataProvider>
  );
}
