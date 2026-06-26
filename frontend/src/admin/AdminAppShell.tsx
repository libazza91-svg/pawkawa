import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  createAdminDictionaryTerm,
  createAdminSource,
  getAdminAuditLog,
  getAdminCsrfToken,
  getAdminDashboard,
  getAdminDictionary,
  getAdminOffers,
  getAdminProducts,
  getAdminSources,
  getCurrentAdmin,
  logoutAdmin,
  patchAdminDictionaryTerm,
  patchAdminProduct,
  patchAdminSource,
  type AdminAuditLogItem,
  type AdminDashboardResponse,
  type AdminDictionaryCategory,
  type AdminDictionaryItem,
  type AdminOfferItem,
  type AdminProductItem,
  type AdminSourceItem,
  type AdminUser,
} from './api';

type AdminView = 'dashboard' | 'products' | 'offers' | 'sources' | 'dictionary' | 'audit';

const adminSections: Array<{ key: AdminView; label: string; path: string }> = [
  { key: 'dashboard', label: 'Dashboard', path: '/admin' },
  { key: 'products', label: 'Products', path: '/admin/products' },
  { key: 'offers', label: 'Offers', path: '/admin/offers' },
  { key: 'sources', label: 'Sources', path: '/admin/sources' },
  { key: 'dictionary', label: 'Dictionary', path: '/admin/dictionary' },
  { key: 'audit', label: 'Audit', path: '/admin/audit' },
];

const dictionaryCategories: AdminDictionaryCategory[] = [
  'brand_alias',
  'product_alias',
  'formula_token',
  'ingredient_normalization',
  'pack_size_pattern',
  'bundle_keyword',
  'conditional_price_keyword',
  'retailer_mapping',
  'exclusion_keyword',
];

function normalizeAdminView(value?: string): AdminView {
  if (value === 'products' || value === 'offers' || value === 'sources' || value === 'dictionary' || value === 'audit') return value;
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

function normalizeTextInput(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function AdminEmptyState({ label }: { label: string }) {
  return (
    <div className="admin-empty-state">
      <strong>No {label} yet</strong>
      <p>This admin panel will show records here once they are available in the staging database.</p>
    </div>
  );
}

function AdminFormNotice({ error, success }: { error: string | null; success: string | null }) {
  if (error) {
    return <p className="admin-form-error" role="alert">{error}</p>;
  }

  if (success) {
    return <p className="admin-form-success" role="status">{success}</p>;
  }

  return null;
}

function AdminDashboardView({ dashboard, csrfReady }: { dashboard: AdminDashboardResponse | null; csrfReady: boolean }) {
  return (
    <section className="admin-dashboard-shell">
      <p className="eyebrow">Admin Dashboard</p>
      <h1>Read-only summary plus controlled write readiness.</h1>
      <p>We can now inspect current catalog state and perform a small set of audited admin mutations without exposing public-facing price controls.</p>
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
          <small>CSRF write gate</small>
          <strong>{csrfReady ? 'Ready' : 'Unavailable'}</strong>
        </span>
      </div>
      <p className="admin-footnote">Latest offer check: {formatAdminDate(dashboard?.summary.latest_offer_checked_at)}</p>
    </section>
  );
}

function AdminProductsView({
  items,
  csrfToken,
  onSaved,
}: {
  items: AdminProductItem[];
  csrfToken: string;
  onSaved: () => Promise<void>;
}) {
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '',
    species: '',
    life_stage: '',
    product_type: '',
    format: '',
    origin: '',
    status: '',
    verification_status: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!items.length) {
      setSelectedProductId(null);
      return;
    }

    if (!selectedProductId || !items.some((item) => item.product_id === selectedProductId)) {
      setSelectedProductId(items[0].product_id);
    }
  }, [items, selectedProductId]);

  useEffect(() => {
    const selected = items.find((item) => item.product_id === selectedProductId);
    if (!selected) return;

    setForm({
      name: selected.name ?? '',
      species: selected.species ?? '',
      life_stage: selected.life_stage ?? '',
      product_type: selected.product_type ?? '',
      format: selected.format ?? '',
      origin: selected.origin ?? '',
      status: selected.status ?? '',
      verification_status: selected.verification_status ?? '',
    });
    setError(null);
    setSuccess(null);
  }, [items, selectedProductId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProductId) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await patchAdminProduct(
        selectedProductId,
        {
          name: form.name.trim(),
          species: normalizeTextInput(form.species),
          life_stage: normalizeTextInput(form.life_stage),
          product_type: normalizeTextInput(form.product_type),
          format: normalizeTextInput(form.format),
          origin: normalizeTextInput(form.origin),
          status: form.status.trim(),
          verification_status: form.verification_status.trim(),
        },
        csrfToken,
      );
      await onSaved();
      setSuccess('Product metadata saved.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Product update failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminTablePanel title="Products" eyebrow="Catalog" empty={<AdminEmptyState label="products" />} hasItems={items.length > 0}>
      <div className="admin-table-wrap">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Brand</th>
              <th>Species</th>
              <th>Life stage</th>
              <th>Pack</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.product_id}>
                <td>{item.product_id}</td>
                <td>{item.name}</td>
                <td>{item.brand_name || '-'}</td>
                <td>{item.species || '-'}</td>
                <td>{item.life_stage || '-'}</td>
                <td>{item.package_size_g ? `${item.package_size_g}g` : '-'}</td>
                <td>{item.status || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="admin-form-panel" onSubmit={handleSubmit}>
        <div className="admin-form-heading">
          <div>
            <strong>Edit product metadata</strong>
            <p>Current schema does not store product slugs in `products`, so this controlled edit uses `product_id`.</p>
          </div>
          <label className="admin-inline-field">
            Product
            <select onChange={(event) => setSelectedProductId(Number(event.target.value))} value={selectedProductId ?? ''}>
              {items.map((item) => (
                <option key={item.product_id} value={item.product_id}>
                  {item.product_id} - {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-form-grid">
          <label>
            Name
            <input onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required type="text" value={form.name} />
          </label>
          <label>
            Species
            <input onChange={(event) => setForm((current) => ({ ...current, species: event.target.value }))} type="text" value={form.species} />
          </label>
          <label>
            Life stage
            <input onChange={(event) => setForm((current) => ({ ...current, life_stage: event.target.value }))} type="text" value={form.life_stage} />
          </label>
          <label>
            Product type
            <input onChange={(event) => setForm((current) => ({ ...current, product_type: event.target.value }))} type="text" value={form.product_type} />
          </label>
          <label>
            Format
            <input onChange={(event) => setForm((current) => ({ ...current, format: event.target.value }))} type="text" value={form.format} />
          </label>
          <label>
            Origin
            <input onChange={(event) => setForm((current) => ({ ...current, origin: event.target.value }))} type="text" value={form.origin} />
          </label>
          <label>
            Status
            <input onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} required type="text" value={form.status} />
          </label>
          <label>
            Verification status
            <input onChange={(event) => setForm((current) => ({ ...current, verification_status: event.target.value }))} required type="text" value={form.verification_status} />
          </label>
        </div>
        <AdminFormNotice error={error} success={success} />
        <div className="admin-form-actions">
          <button className="primary-button" disabled={submitting || !csrfToken || !selectedProductId} type="submit">
            {submitting ? 'Saving...' : 'Save product changes'}
          </button>
        </div>
      </form>
    </AdminTablePanel>
  );
}

function AdminSourcesView({
  items,
  products,
  csrfToken,
  onSaved,
}: {
  items: AdminSourceItem[];
  products: AdminProductItem[];
  csrfToken: string;
  onSaved: () => Promise<void>;
}) {
  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState({
    product_id: products[0]?.product_id?.toString() ?? '',
    source_url: '',
    source_type: 'retailer',
    status: 'active',
    needs_review: false,
    notes: '',
    expected_pack_size_g: '',
    expected_offer_type: '',
    expected_unit_count: '',
  });
  const [editForm, setEditForm] = useState({
    source_url: '',
    source_type: '',
    status: 'active',
    needs_review: false,
    notes: '',
    expected_pack_size_g: '',
    expected_offer_type: '',
    expected_unit_count: '',
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!products.length) return;
    setCreateForm((current) => ({
      ...current,
      product_id: current.product_id || String(products[0].product_id),
    }));
  }, [products]);

  useEffect(() => {
    if (!items.length) {
      setSelectedSourceId(null);
      return;
    }

    if (!selectedSourceId || !items.some((item) => item.source_id === selectedSourceId)) {
      setSelectedSourceId(items[0].source_id);
    }
  }, [items, selectedSourceId]);

  useEffect(() => {
    const selected = items.find((item) => item.source_id === selectedSourceId);
    if (!selected) return;

    setEditForm({
      source_url: selected.source_url ?? '',
      source_type: selected.source_type ?? '',
      status: selected.status ?? 'active',
      needs_review: Boolean(selected.needs_review),
      notes: selected.notes ?? '',
      expected_pack_size_g: selected.expected_pack_size_g ? String(selected.expected_pack_size_g) : '',
      expected_offer_type: selected.expected_offer_type ?? '',
      expected_unit_count: selected.expected_unit_count ? String(selected.expected_unit_count) : '',
    });
    setError(null);
    setSuccess(null);
  }, [items, selectedSourceId]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await createAdminSource(
        {
          product_id: Number(createForm.product_id),
          source_url: createForm.source_url.trim(),
          source_type: createForm.source_type.trim(),
          status: createForm.status as 'active' | 'disabled',
          needs_review: createForm.needs_review,
          notes: normalizeTextInput(createForm.notes),
          expected_pack_size_g: parseOptionalInteger(createForm.expected_pack_size_g),
          expected_offer_type: normalizeTextInput(createForm.expected_offer_type),
          expected_unit_count: parseOptionalInteger(createForm.expected_unit_count),
        },
        csrfToken,
      );
      await onSaved();
      setCreateForm((current) => ({
        ...current,
        source_url: '',
        notes: '',
        expected_pack_size_g: '',
        expected_offer_type: '',
        expected_unit_count: '',
      }));
      setSuccess('Source URL created.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Source URL creation failed.');
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSourceId) return;

    setEditSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await patchAdminSource(
        selectedSourceId,
        {
          source_url: editForm.source_url.trim(),
          source_type: editForm.source_type.trim(),
          status: editForm.status as 'active' | 'disabled',
          needs_review: editForm.needs_review,
          notes: normalizeTextInput(editForm.notes),
          expected_pack_size_g: parseOptionalInteger(editForm.expected_pack_size_g),
          expected_offer_type: normalizeTextInput(editForm.expected_offer_type),
          expected_unit_count: parseOptionalInteger(editForm.expected_unit_count),
        },
        csrfToken,
      );
      await onSaved();
      setSuccess('Source URL updated.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Source URL update failed.');
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <AdminTablePanel title="Sources" eyebrow="Source URL management" empty={<AdminEmptyState label="sources" />} hasItems={items.length > 0 || products.length > 0}>
      {items.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Product</th>
                <th>Type</th>
                <th>Status</th>
                <th>Review</th>
                <th>Expected pack</th>
                <th>URL</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.source_id}>
                  <td>{item.source_id}</td>
                  <td>{item.product_name || item.product_id || '-'}</td>
                  <td>{item.source_type || '-'}</td>
                  <td>{item.status || '-'}</td>
                  <td>{item.needs_review ? 'Needs review' : 'Clear'}</td>
                  <td>{item.expected_pack_size_g ? `${item.expected_pack_size_g}g` : '-'}</td>
                  <td>{item.source_url ? <a href={item.source_url} rel="noreferrer" target="_blank">Open</a> : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <AdminEmptyState label="source records" />
      )}

      <div className="admin-form-split">
        <form className="admin-form-panel" onSubmit={handleCreate}>
          <div className="admin-form-heading">
            <div>
              <strong>Add source URL</strong>
              <p>Use this for controlled source records only. It does not trigger ingestion or price updates.</p>
            </div>
          </div>
          <div className="admin-form-grid">
            <label>
              Product
              <select onChange={(event) => setCreateForm((current) => ({ ...current, product_id: event.target.value }))} required value={createForm.product_id}>
                {products.map((product) => (
                  <option key={product.product_id} value={product.product_id}>
                    {product.product_id} - {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Source type
              <input onChange={(event) => setCreateForm((current) => ({ ...current, source_type: event.target.value }))} type="text" value={createForm.source_type} />
            </label>
            <label className="admin-form-grid-span-2">
              Source URL
              <input onChange={(event) => setCreateForm((current) => ({ ...current, source_url: event.target.value }))} required type="url" value={createForm.source_url} />
            </label>
            <label>
              Status
              <select onChange={(event) => setCreateForm((current) => ({ ...current, status: event.target.value }))} value={createForm.status}>
                <option value="active">active</option>
                <option value="disabled">disabled</option>
              </select>
            </label>
            <label>
              Expected pack size (g)
              <input onChange={(event) => setCreateForm((current) => ({ ...current, expected_pack_size_g: event.target.value }))} type="number" value={createForm.expected_pack_size_g} />
            </label>
            <label>
              Expected offer type
              <input onChange={(event) => setCreateForm((current) => ({ ...current, expected_offer_type: event.target.value }))} type="text" value={createForm.expected_offer_type} />
            </label>
            <label>
              Expected unit count
              <input onChange={(event) => setCreateForm((current) => ({ ...current, expected_unit_count: event.target.value }))} type="number" value={createForm.expected_unit_count} />
            </label>
            <label className="admin-checkbox-field">
              <input checked={createForm.needs_review} onChange={(event) => setCreateForm((current) => ({ ...current, needs_review: event.target.checked }))} type="checkbox" />
              Mark as needs review
            </label>
            <label className="admin-form-grid-span-2">
              Notes
              <textarea onChange={(event) => setCreateForm((current) => ({ ...current, notes: event.target.value }))} rows={4} value={createForm.notes} />
            </label>
          </div>
          <AdminFormNotice error={error} success={success} />
          <div className="admin-form-actions">
            <button className="primary-button" disabled={createSubmitting || !csrfToken || !products.length} type="submit">
              {createSubmitting ? 'Saving...' : 'Create source URL'}
            </button>
          </div>
        </form>

        <form className="admin-form-panel" onSubmit={handleEdit}>
          <div className="admin-form-heading">
            <div>
              <strong>Edit source URL</strong>
              <p>Disable noisy URLs, flag review work, or document expected pack / offer shape.</p>
            </div>
            <label className="admin-inline-field">
              Source
              <select onChange={(event) => setSelectedSourceId(Number(event.target.value))} value={selectedSourceId ?? ''}>
                {items.map((item) => (
                  <option key={item.source_id} value={item.source_id}>
                    {item.source_id} - {item.product_name || item.source_url}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="admin-form-grid">
            <label className="admin-form-grid-span-2">
              Source URL
              <input onChange={(event) => setEditForm((current) => ({ ...current, source_url: event.target.value }))} required type="url" value={editForm.source_url} />
            </label>
            <label>
              Source type
              <input onChange={(event) => setEditForm((current) => ({ ...current, source_type: event.target.value }))} type="text" value={editForm.source_type} />
            </label>
            <label>
              Status
              <select onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))} value={editForm.status}>
                <option value="active">active</option>
                <option value="disabled">disabled</option>
              </select>
            </label>
            <label>
              Expected pack size (g)
              <input onChange={(event) => setEditForm((current) => ({ ...current, expected_pack_size_g: event.target.value }))} type="number" value={editForm.expected_pack_size_g} />
            </label>
            <label>
              Expected offer type
              <input onChange={(event) => setEditForm((current) => ({ ...current, expected_offer_type: event.target.value }))} type="text" value={editForm.expected_offer_type} />
            </label>
            <label>
              Expected unit count
              <input onChange={(event) => setEditForm((current) => ({ ...current, expected_unit_count: event.target.value }))} type="number" value={editForm.expected_unit_count} />
            </label>
            <label className="admin-checkbox-field">
              <input checked={editForm.needs_review} onChange={(event) => setEditForm((current) => ({ ...current, needs_review: event.target.checked }))} type="checkbox" />
              Mark as needs review
            </label>
            <label className="admin-form-grid-span-2">
              Notes
              <textarea onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))} rows={4} value={editForm.notes} />
            </label>
          </div>
          <AdminFormNotice error={error} success={success} />
          <div className="admin-form-actions">
            <button className="primary-button" disabled={editSubmitting || !csrfToken || !selectedSourceId} type="submit">
              {editSubmitting ? 'Saving...' : 'Save source changes'}
            </button>
          </div>
        </form>
      </div>
    </AdminTablePanel>
  );
}

function AdminDictionaryView({
  items,
  csrfToken,
  onSaved,
}: {
  items: AdminDictionaryItem[];
  csrfToken: string;
  onSaved: () => Promise<void>;
}) {
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState({
    category: 'bundle_keyword' as AdminDictionaryCategory,
    raw_term: '',
    normalized_value: '',
    pattern: '',
    retailer_slug: '',
    notes: '',
    status: 'active',
    needs_review: false,
  });
  const [editForm, setEditForm] = useState({
    category: 'bundle_keyword' as AdminDictionaryCategory,
    raw_term: '',
    normalized_value: '',
    pattern: '',
    retailer_slug: '',
    notes: '',
    status: 'active',
    needs_review: false,
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!items.length) {
      setSelectedTermId(null);
      return;
    }

    if (!selectedTermId || !items.some((item) => item.id === selectedTermId)) {
      setSelectedTermId(items[0].id);
    }
  }, [items, selectedTermId]);

  useEffect(() => {
    const selected = items.find((item) => item.id === selectedTermId);
    if (!selected) return;

    setEditForm({
      category: selected.category,
      raw_term: selected.raw_term,
      normalized_value: selected.normalized_value ?? '',
      pattern: selected.pattern ?? '',
      retailer_slug: selected.retailer_slug ?? '',
      notes: selected.notes ?? '',
      status: selected.status,
      needs_review: selected.needs_review,
    });
    setError(null);
    setSuccess(null);
  }, [items, selectedTermId]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await createAdminDictionaryTerm(
        {
          category: createForm.category,
          raw_term: createForm.raw_term.trim(),
          normalized_value: normalizeTextInput(createForm.normalized_value),
          pattern: normalizeTextInput(createForm.pattern),
          retailer_slug: normalizeTextInput(createForm.retailer_slug),
          notes: normalizeTextInput(createForm.notes),
          status: createForm.status as 'active' | 'disabled',
          needs_review: createForm.needs_review,
        },
        csrfToken,
      );
      await onSaved();
      setCreateForm((current) => ({
        ...current,
        raw_term: '',
        normalized_value: '',
        pattern: '',
        retailer_slug: '',
        notes: '',
      }));
      setSuccess('Dictionary term created.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Dictionary term creation failed.');
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTermId) return;

    setEditSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await patchAdminDictionaryTerm(
        selectedTermId,
        {
          category: editForm.category,
          raw_term: editForm.raw_term.trim(),
          normalized_value: normalizeTextInput(editForm.normalized_value),
          pattern: normalizeTextInput(editForm.pattern),
          retailer_slug: normalizeTextInput(editForm.retailer_slug),
          notes: normalizeTextInput(editForm.notes),
          status: editForm.status as 'active' | 'disabled',
          needs_review: editForm.needs_review,
        },
        csrfToken,
      );
      await onSaved();
      setSuccess('Dictionary term updated.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Dictionary term update failed.');
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <AdminTablePanel title="Dictionary" eyebrow="Normalization and parsing terms" empty={<AdminEmptyState label="dictionary terms" />} hasItems={true}>
      {items.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Category</th>
                <th>Raw term</th>
                <th>Normalized</th>
                <th>Retailer</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.category}</td>
                  <td>{item.raw_term}</td>
                  <td>{item.normalized_value || '-'}</td>
                  <td>{item.retailer_slug || '-'}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <AdminEmptyState label="dictionary terms" />
      )}

      <div className="admin-form-split">
        <form className="admin-form-panel" onSubmit={handleCreate}>
          <div className="admin-form-heading">
            <div>
              <strong>Add dictionary term</strong>
              <p>Use categories to document aliasing, bundle clues, conditional price keywords, or exclusion rules.</p>
            </div>
          </div>
          <div className="admin-form-grid">
            <label>
              Category
              <select onChange={(event) => setCreateForm((current) => ({ ...current, category: event.target.value as AdminDictionaryCategory }))} value={createForm.category}>
                {dictionaryCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select onChange={(event) => setCreateForm((current) => ({ ...current, status: event.target.value }))} value={createForm.status}>
                <option value="active">active</option>
                <option value="disabled">disabled</option>
              </select>
            </label>
            <label className="admin-form-grid-span-2">
              Raw term
              <input onChange={(event) => setCreateForm((current) => ({ ...current, raw_term: event.target.value }))} required type="text" value={createForm.raw_term} />
            </label>
            <label>
              Normalized value
              <input onChange={(event) => setCreateForm((current) => ({ ...current, normalized_value: event.target.value }))} type="text" value={createForm.normalized_value} />
            </label>
            <label>
              Retailer slug
              <input onChange={(event) => setCreateForm((current) => ({ ...current, retailer_slug: event.target.value }))} type="text" value={createForm.retailer_slug} />
            </label>
            <label className="admin-form-grid-span-2">
              Pattern
              <input onChange={(event) => setCreateForm((current) => ({ ...current, pattern: event.target.value }))} type="text" value={createForm.pattern} />
            </label>
            <label className="admin-checkbox-field">
              <input checked={createForm.needs_review} onChange={(event) => setCreateForm((current) => ({ ...current, needs_review: event.target.checked }))} type="checkbox" />
              Mark as needs review
            </label>
            <label className="admin-form-grid-span-2">
              Notes
              <textarea onChange={(event) => setCreateForm((current) => ({ ...current, notes: event.target.value }))} rows={4} value={createForm.notes} />
            </label>
          </div>
          <AdminFormNotice error={error} success={success} />
          <div className="admin-form-actions">
            <button className="primary-button" disabled={createSubmitting || !csrfToken} type="submit">
              {createSubmitting ? 'Saving...' : 'Create dictionary term'}
            </button>
          </div>
        </form>

        <form className="admin-form-panel" onSubmit={handleEdit}>
          <div className="admin-form-heading">
            <div>
              <strong>Edit dictionary term</strong>
              <p>Keep retailer mappings and parsing vocabulary reviewed before they affect wider admin workflows.</p>
            </div>
            <label className="admin-inline-field">
              Term
              <select onChange={(event) => setSelectedTermId(Number(event.target.value))} value={selectedTermId ?? ''}>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} - {item.raw_term}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="admin-form-grid">
            <label>
              Category
              <select onChange={(event) => setEditForm((current) => ({ ...current, category: event.target.value as AdminDictionaryCategory }))} value={editForm.category}>
                {dictionaryCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))} value={editForm.status}>
                <option value="active">active</option>
                <option value="disabled">disabled</option>
              </select>
            </label>
            <label className="admin-form-grid-span-2">
              Raw term
              <input onChange={(event) => setEditForm((current) => ({ ...current, raw_term: event.target.value }))} required type="text" value={editForm.raw_term} />
            </label>
            <label>
              Normalized value
              <input onChange={(event) => setEditForm((current) => ({ ...current, normalized_value: event.target.value }))} type="text" value={editForm.normalized_value} />
            </label>
            <label>
              Retailer slug
              <input onChange={(event) => setEditForm((current) => ({ ...current, retailer_slug: event.target.value }))} type="text" value={editForm.retailer_slug} />
            </label>
            <label className="admin-form-grid-span-2">
              Pattern
              <input onChange={(event) => setEditForm((current) => ({ ...current, pattern: event.target.value }))} type="text" value={editForm.pattern} />
            </label>
            <label className="admin-checkbox-field">
              <input checked={editForm.needs_review} onChange={(event) => setEditForm((current) => ({ ...current, needs_review: event.target.checked }))} type="checkbox" />
              Mark as needs review
            </label>
            <label className="admin-form-grid-span-2">
              Notes
              <textarea onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))} rows={4} value={editForm.notes} />
            </label>
          </div>
          <AdminFormNotice error={error} success={success} />
          <div className="admin-form-actions">
            <button className="primary-button" disabled={editSubmitting || !csrfToken || !selectedTermId} type="submit">
              {editSubmitting ? 'Saving...' : 'Save dictionary changes'}
            </button>
          </div>
        </form>
      </div>
    </AdminTablePanel>
  );
}

function AdminOffersView({ items }: { items: AdminOfferItem[] }) {
  return (
    <AdminTablePanel title="Offers" eyebrow="Retail offers" empty={<AdminEmptyState label="offers" />} hasItems={items.length > 0}>
      <div className="admin-table-wrap">
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
      </div>
    </AdminTablePanel>
  );
}

function AdminAuditView({ items }: { items: AdminAuditLogItem[] }) {
  return (
    <AdminTablePanel title="Audit log" eyebrow="Admin events" empty={<AdminEmptyState label="audit events" />} hasItems={items.length > 0}>
      <div className="admin-table-wrap">
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
      </div>
    </AdminTablePanel>
  );
}

function AdminTablePanel({
  eyebrow,
  title,
  hasItems,
  empty,
  children,
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
      {hasItems ? children : empty}
    </section>
  );
}

export function AdminAppShell({ navigate, view: rawView }: { navigate: (path: string) => void; view?: string }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [products, setProducts] = useState<AdminProductItem[]>([]);
  const [offers, setOffers] = useState<AdminOfferItem[]>([]);
  const [sources, setSources] = useState<AdminSourceItem[]>([]);
  const [dictionaryItems, setDictionaryItems] = useState<AdminDictionaryItem[]>([]);
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
        if (!cancelled) setCsrfToken(csrf.csrf_token);
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

  async function loadAdminView(targetView: AdminView) {
    setDataLoading(true);
    setDataError(null);

    try {
      if (targetView === 'dashboard') {
        setDashboard(await getAdminDashboard());
      } else if (targetView === 'products') {
        setProducts((await getAdminProducts()).items);
      } else if (targetView === 'offers') {
        setOffers((await getAdminOffers()).items);
      } else if (targetView === 'sources') {
        const [sourceData, productData] = await Promise.all([getAdminSources(), getAdminProducts()]);
        setSources(sourceData.items);
        setProducts(productData.items);
      } else if (targetView === 'dictionary') {
        setDictionaryItems((await getAdminDictionary()).items);
      } else {
        setAuditLog((await getAdminAuditLog()).items);
      }
    } catch {
      setDataError('Admin data is not available right now.');
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    loadAdminView(view);
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
        <aside aria-label="Admin navigation" className="admin-sidebar">
          {adminSections.map((section) => (
            <button className={section.key === view ? 'active' : ''} key={section.key} onClick={() => navigate(section.path)} type="button">
              {section.label}
            </button>
          ))}
        </aside>
        {dataLoading && <section className="admin-dashboard-shell"><div className="admin-loading-inline">Loading admin data...</div></section>}
        {!dataLoading && dataError && <section className="admin-dashboard-shell"><div className="admin-empty-state"><strong>{dataError}</strong></div></section>}
        {!dataLoading && !dataError && view === 'dashboard' && <AdminDashboardView csrfReady={Boolean(csrfToken)} dashboard={dashboard} />}
        {!dataLoading && !dataError && view === 'products' && <AdminProductsView csrfToken={csrfToken} items={products} onSaved={() => loadAdminView('products')} />}
        {!dataLoading && !dataError && view === 'offers' && <AdminOffersView items={offers} />}
        {!dataLoading && !dataError && view === 'sources' && <AdminSourcesView csrfToken={csrfToken} items={sources} onSaved={() => loadAdminView('sources')} products={products} />}
        {!dataLoading && !dataError && view === 'dictionary' && <AdminDictionaryView csrfToken={csrfToken} items={dictionaryItems} onSaved={() => loadAdminView('dictionary')} />}
        {!dataLoading && !dataError && view === 'audit' && <AdminAuditView items={auditLog} />}
      </section>
    </main>
  );
}
