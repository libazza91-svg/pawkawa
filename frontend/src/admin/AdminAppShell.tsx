import { useEffect, useState } from 'react';
import { getAdminCsrfToken, getCurrentAdmin, logoutAdmin, type AdminUser } from './api';

const adminSections = ['Products', 'Offers', 'Sources', 'Dictionary', 'Images', 'Jobs', 'Audit'] as const;

export function AdminAppShell({ navigate }: { navigate: (path: string) => void }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [csrfReady, setCsrfReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const current = await getCurrentAdmin();
        if (cancelled) return;
        setUser(current.user);
        const csrf = await getAdminCsrfToken();
        if (!cancelled) setCsrfReady(Boolean(csrf.csrf_token));
      } catch {
        if (!cancelled) navigate('/admin/login');
        return;
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logoutAdmin();
    } finally {
      navigate('/admin/login');
    }
  }

  if (loading) {
    return (
      <main className="admin-page">
        <div className="admin-loading-panel">Checking admin session...</div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div className="admin-brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <img alt="" src="/logo.png" />
          </span>
          <div>
            <strong>Pawkawa Admin</strong>
            <span>Operations console</span>
          </div>
        </div>
        <div className="admin-user-chip">
          <span>{user.name}</span>
          <small>{user.email}</small>
          <button className="secondary-button" disabled={loggingOut} onClick={handleLogout} type="button">
            {loggingOut ? 'Signing out...' : 'Logout'}
          </button>
        </div>
      </header>

      <section className="admin-layout">
        <aside className="admin-sidebar" aria-label="Admin navigation">
          {adminSections.map((section) => (
            <button className={section === 'Products' ? 'active' : ''} disabled key={section} type="button">
              {section}
            </button>
          ))}
        </aside>
        <section className="admin-dashboard-shell">
          <p className="eyebrow">Admin Dashboard</p>
          <h1>Admin access is ready.</h1>
          <p>
            This shell confirms protected session access, logout, current user display, and CSRF readiness before data editing tools are introduced.
          </p>
          <div className="admin-status-grid">
            <span>
              <small>Session</small>
              <strong>Authenticated</strong>
            </span>
            <span>
              <small>CSRF</small>
              <strong>{csrfReady ? 'Ready' : 'Unavailable'}</strong>
            </span>
            <span>
              <small>Role</small>
              <strong>{user.role}</strong>
            </span>
          </div>
        </section>
      </section>
    </main>
  );
}
