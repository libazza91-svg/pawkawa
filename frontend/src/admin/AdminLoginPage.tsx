import { FormEvent, useEffect, useState } from 'react';
import { getCurrentAdmin, loginAdmin } from './api';

export function AdminLoginPage({ navigate }: { navigate: (path: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getCurrentAdmin()
      .then(() => {
        if (!cancelled) navigate('/admin');
      })
      .catch(() => {
        if (!cancelled) setCheckingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await loginAdmin(email, password);
      navigate('/admin');
    } catch {
      setError('Invalid email or password');
      setSubmitting(false);
    }
  }

  return (
    <main className="admin-auth-page">
      <section className="admin-login-panel" aria-label="Admin login">
        <div className="admin-brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <img alt="" src="/logo.png" />
          </span>
          <div>
            <strong>Pawkawa Admin</strong>
            <span>Internal access</span>
          </div>
        </div>
        <div className="admin-login-copy">
          <p className="eyebrow">Admin Console</p>
          <h1>Sign in to manage Pawkawa operations.</h1>
          <p>Use your admin account to access protected internal tools.</p>
        </div>
        {checkingSession ? (
          <p className="muted">Checking current session...</p>
        ) : (
          <form className="admin-login-form" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                autoComplete="email"
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label>
              Password
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            {error && <p className="admin-form-error" role="alert">{error}</p>}
            <button className="primary-button" disabled={submitting} type="submit">
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
