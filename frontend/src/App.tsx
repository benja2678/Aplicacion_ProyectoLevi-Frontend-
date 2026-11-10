import { useState } from 'react';
import { HashRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { ImportDialog } from './components/ImportDialog';
import { Icon } from './components/ui';
import { AuthProvider, useAuth } from './data/AuthContext';
import { DataProvider, useData } from './data/DataContext';
import { DATA_SOURCE } from './data/repository';
import { LoginPage } from './pages/LoginPage';
import { StudentPage } from './pages/StudentPage';
import { StudentsPage } from './pages/StudentsPage';

export default function App() {
  // Demo con localStorage: sin login, igual que siempre.
  if (DATA_SOURCE === 'local') return <Panel />;

  // Backend Django: solo entra el profesor con su usuario y contraseña.
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function AuthGate() {
  const { status, username, logout } = useAuth();
  if (status === 'checking') {
    return (
      <main className="login-wrap">
        <span className="muted">Cargando…</span>
      </main>
    );
  }
  if (status === 'signedOut') return <LoginPage />;
  // El panel (y sus datos) solo existe mientras hay sesión iniciada.
  return <Panel account={{ username, logout }} />;
}

interface Account {
  username: string | null;
  logout(): void;
}

function Panel({ account }: { account?: Account }) {
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
            <div className="topbar-actions">
              <button className="btn" onClick={() => setImporting(true)} title="Cargar sesiones del visor">
                <Icon name="upload" /> <span>Cargar sesiones</span>
              </button>
              {account && (
                <>
                  {account.username && <span className="topbar-user">{account.username}</span>}
                  <button className="btn btn-quiet" onClick={account.logout} title="Cerrar sesión">
                    <Icon name="logout" /> <span>Cerrar sesión</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="container">
          <DataErrorBanner />
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

/** Muestra si no se pudieron cargar los datos o si falló una acción (por ejemplo, sin conexión). */
function DataErrorBanner() {
  const { error, reload } = useData();
  if (!error) return null;
  return (
    <div className="banner" role="alert">
      <span>{error}</span>
      <button className="btn btn-quiet" onClick={() => void reload()}>
        Reintentar
      </button>
    </div>
  );
}
