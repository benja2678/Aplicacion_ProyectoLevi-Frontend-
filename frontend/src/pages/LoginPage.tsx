import { useState, type FormEvent } from 'react';
import { Icon } from '../components/ui';
import { useAuth } from '../context/authState';

/** Pantalla de inicio de sesión del lector: docente o equipo (solo en modo api). No hay registro público. */
export function LoginPage() {
  const { login, notice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return setError('Escribe tu correo y tu contraseña.');
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPassword('');
      setBusy(false);
    }
  }

  return (
    <main className="login-wrap">
      <form className="card login-card" onSubmit={submit} noValidate>
        <div className="brand">
          <span className="brand-mark">
            <Icon name="chip" size={18} />
          </span>
          <span>
            Laboratorio VR
            <small>Electrónica Digital</small>
          </span>
        </div>

        <div>
          <h1>Panel docente</h1>
          <p>Ingresa con tu correo y contraseña.</p>
        </div>

        {notice && !error && <div className="notice">{notice}</div>}

        <div className="field">
          <label htmlFor="login-user">Correo</label>
          <input
            id="login-user"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="login-pass">Contraseña</label>
          <input
            id="login-pass"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}

        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
