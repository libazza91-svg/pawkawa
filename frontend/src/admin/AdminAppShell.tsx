import { useEffect, useState, type ReactNode } from 'react';
import {
  getAdminAuditLog,
  getAdminCsrfToken,
  getAdminDashboard,
  getAdminOffers,
  getAdminProducts,
  getAdminSources,
  getCurrentAdmin,
  logoutAdmin,
  type AdminAuditLogItem,
  type AdminDashboardResponse,
  type AdminOfferItem,
  type AdminProductItem,
  type AdminSourceItem,
  type AdminUser
} from './api';

type AdminView = 'dashboard' | 'products' | 'offers' | 'sources' | 'audit';

const adminSections: Array<{ key: AdminView; label: string; path: string }> = [
  { key: 'dashboard', label: 'Dashboard', path: '/admin' },
  { key: 'products', label: 'Products', path: '/admin/products' },
  { key: 'offers', label: 'Offers', path: '/admin/offers' },
  { key: 'sources', label: 'Sources', path: '/admin/sources' },
  { key: 'audit', label: 'Audit', path: '/admin/audit' }
];

function normalizeAdminView(value?: string): AdminView {
  if (value === 'products' || value === 'offers' || value === 'sources' || value === 'audit') return value;
  return 'dashboard';
}

function formatAdminDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatAdminMoney(value: string | number, currency = 'AUD') {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '-';
  return `${currency} $${parsed.toFixed(2)}`;
}

function AdminEmptyState({ label }: { label: string }) {
  return (
    <div className="admin-empty-state">
      <strong>No {label} yet</strong>
      <p>This read-only admin view will show records once they exist in the staging database.</p>
    </div>
  );
}

function AdminDashboardView({ dashboard, csrfReady }: { dashboard: AdminDashboardResponse | null; csrfReady: boolean }) {
  return (
    <section className="admin-dashboard-shell">
      <p className="eyebrow">Admin Dashboard</p>
      <h1>Read-only staging overview.</h1>
      <p>Use this view to inspect current catalog, offer, source and audit coverage before enabling admin write tools.</p>
      <div className="admin-status-grid">
        <span>
          <small>Products</small>
          <strong>{dashboard?.summary.products ?? '-'}</strong>
        </span>
        <span>
          <small>Offers</small>
          <strong>{dashboard?.summary.offers ?? '-'}</strong>
        </span>
        <span>
          <small>Retailers</small>
          <strong>{dashboard?.summary.retailers ?? '-'}</strong>
        </span>
        <span>
          <small>Sources</small>
          <strong>{dashboard?.summary.sources ?? '-'}</strong>
        </span>
        <span>
          <small>Audit events</small>
          <strong>{dashboard?.summary.audit_events ?? '-'}</strong>
        </span>
        <span>
          <small>CSRF foundation</small>
          <strong>{csrfReady ? 'Ready' : 'Unavailable'}</strong>
        </span>
      </div>
      <p className="admin-footnote">Latest offer check: {formatAdminDate(dashboard?.summary.latest_offer_checked_at)}</p>
    </section>
  );
}

function AdminProductsView({ items }: { items: AdminProductItem[] }) {
  return (
    <AdminTablePanel title="Products" eyebrow="Catalog" empty={<AdminEmptyState label="products" />} hasItems={items.length > 0}>
      <table className="admin-data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Brand</th>
            <th>Species</th>
            <th>Life stage</th>
            <th>Pack</th>
            <th>Confidence</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.product_id}>
              <td>{item.name}</td>
              <td>{item.brand_name || '-'}</td>
              <td>{item.species || '-'}</td>
              <td>{item.life_stage || '-'}</td>
              <td>{item.package_size_g ? `${item.package_size_g}g` : '-'}</td>
              <td>{item.confidence_score ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminTablePanel>
  );
}

function AdminOffersView({ items }: { items: AdminOfferItem[] }) {
  return (
    <AdminTablePanel title="Offers" eyebrow="Retail offers" empty={<AdminEmptyState label="offers" />} hasItems={items.length > 0}>
      <table className="admin-data-table">
        <thead>
          <tr>
            <th>Product slug</th>
            <th>Retailer</th>
            <th>Market</th>
            <th>Pack</th>
            <th>Effective price</th>
            <th>Stock</th>
            <th>Checked</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.retail_offer_id}>
              <td>{item.product_slug}</td>
              <td>{item.retailer_name}</td>
              <td>{item.market} / {item.currency}</td>
              <td>{item.pack_size_g}g</td>
              <td>{formatAdminMoney(item.effective_price, item.currency)}</td>
              <td>{item.stock_status}</td>
              <td>{formatAdminDate(item.last_checked_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminTablePanel>
  );
}

function AdminSourcesView({ items }: { items: AdminSourceItem[] }) {
  return (
    <AdminTablePanel title="Sources" eyebrow="Source records" empty={<AdminEmptyState label="sources" />} hasItems={items.length > 0}>
      <table className="admin-data-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Type</th>
            <th>Confidence</th>
            <th>Captured</th>
            <th>URL</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.source_id}>
              <td>{item.product_name || item.product_id || '-'}</td>
              <td>{item.source_type || '-'}</td>
              <td>{item.confidence_score ?? '-'}</td>
              <td>{formatAdminDate(item.captured_at)}</td>
              <td>{item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer">Open</a> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminTablePanel>
  );
}

function AdminAuditView({ items }: { items: AdminAuditLogItem[] }) {
  return (
    <AdminTablePanel title="Audit log" eyebrow="Admin events" empty={<AdminEmptyState label="audit events" />} hasItems={items.length > 0}>
      <table className="admin-data-table">
        <thead>
          <tr>
            <th>Action</th>
            <th>Entity</th>
            <th>Actor</th>
            <th>Reason</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.action}</td>
              <td>{item.entity_type}:{item.entity_id}</td>
              <td>{item.actor_admin_user_id || 'system'}</td>
              <td>{item.reason || '-'}</td>
              <td>{formatAdminDate(item.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminTablePanel>
  );
}

function AdminTablePanel({
  eyebrow,
  title,
  hasItems,
  empty,
  children
}: {
  eyebrow: string;
  title: string;
  hasItems: boolean;
  empty: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="admin-dashboard-shell">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {hasItems ? <div className="admin-table-wrap">{children}</div> : empty}
    </section>
  );
}

export function AdminAppShell({ navigate, view: rawView }: { navigate: (path: string) => void; view?: string }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [csrfReady, setCsrfReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [products, setProducts] = useState<AdminProductItem[]>([]);
  const [offers, setOffers] = useState<AdminOfferItem[]>([]);
  const [sources, setSources] = useState<AdminSourceItem[]>([]);
  const [auditLog, setAuditLog] = useState<AdminAuditLogItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const view = normalizeAdminView(rawView);

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

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    setDataLoading(true);
    setDataError(null);

    const request =
      view === 'dashboard' ? getAdminDashboard() :
      view === 'products' ? getAdminProducts() :
      view === 'offers' ? getAdminOffers() :
      view === 'sources' ? getAdminSources() :
      getAdminAuditLog();

    request
      .then((data) => {
        if (cancelled) return;
        if (view === 'dashboard') setDashboard(data as AdminDashboardResponse);
        if (view === 'products') setProducts((data as { items: AdminProductItem[] }).items);
        if (view === 'offers') setOffers((data as { items: AdminOfferItem[] }).items);
        if (view === 'sources') setSources((data as { items: AdminSourceItem[] }).items);
        if (view === 'audit') setAuditLog((data as { items: AdminAuditLogItem[] }).items);
        setDataLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setDataError('Admin data is not available right now.');
          setDataLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, view]);

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
            <button className={section.key === view ? 'active' : ''} key={section.key} onClick={() => navigate(section.path)} type="button">
              {section.label}
            </button>
          ))}
        </aside>
        {dataLoading && <section className="admin-dashboard-shell"><div className="admin-loading-inline">Loading admin data...</div></section>}
        {!dataLoading && dataError && <section className="admin-dashboard-shell"><div className="admin-empty-state"><strong>{dataError}</strong></div></section>}
        {!dataLoading && !dataError && view === 'dashboard' && <AdminDashboardView csrfReady={csrfReady} dashboard={dashboard} />}
        {!dataLoading && !dataError && view === 'products' && <AdminProductsView items={products} />}
        {!dataLoading && !dataError && view === 'offers' && <AdminOffersView items={offers} />}
        {!dataLoading && !dataError && view === 'sources' && <AdminSourcesView items={sources} />}
        {!dataLoading && !dataError && view === 'audit' && <AdminAuditView items={auditLog} />}
      </section>
    </main>
  );
}
