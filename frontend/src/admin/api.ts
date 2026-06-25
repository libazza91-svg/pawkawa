import type { ApiResponse } from '../app-types';

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  last_login_at: string | null;
};

export type AdminDashboardResponse = {
  summary: {
    products: number;
    offers: number;
    sources: number;
    audit_events: number;
    retailers: number;
    latest_offer_checked_at: string | null;
  };
};

export type AdminProductItem = {
  product_id: number;
  name: string;
  brand_name: string | null;
  species: string | null;
  life_stage: string | null;
  package_size_g: number | null;
  status: string | null;
  source_count: number | null;
  confidence_score: number | null;
  verification_status: string | null;
  updated_at: string | null;
};

export type AdminOfferItem = {
  retail_offer_id: number;
  product_slug: string;
  retailer_name: string;
  retailer_slug: string;
  market: string;
  currency: string;
  pack_size_g: number;
  effective_price: string | number;
  unit_price_per_kg: string | number;
  stock_status: string;
  source_url: string;
  last_checked_at: string;
};

export type AdminSourceItem = {
  source_id: number;
  product_id: number | null;
  product_name: string | null;
  source_url: string | null;
  source_type: string | null;
  confidence_score: string | number | null;
  captured_at: string | null;
};

export type AdminAuditLogItem = {
  id: number;
  actor_admin_user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: string;
  reason: string | null;
  created_at: string;
};

async function adminApi<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.success) {
    const message = 'error' in payload ? (payload as { error: { message: string } }).error.message : `Admin request failed: ${url}`;
    throw new Error(message);
  }
  return payload.data;
}

export function getCurrentAdmin() {
  return adminApi<{ user: AdminUser }>('/api/admin/auth/me');
}

export function getAdminCsrfToken() {
  return adminApi<{ csrf_token: string }>('/api/admin/auth/csrf');
}

export function loginAdmin(email: string, password: string) {
  return adminApi<{ user: AdminUser }>('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logoutAdmin() {
  return adminApi<{ logged_out: boolean }>('/api/admin/auth/logout', {
    method: 'POST',
  });
}

export function getAdminDashboard() {
  return adminApi<AdminDashboardResponse>('/api/admin/dashboard');
}

export function getAdminProducts() {
  return adminApi<{ items: AdminProductItem[] }>('/api/admin/products');
}

export function getAdminOffers() {
  return adminApi<{ items: AdminOfferItem[] }>('/api/admin/offers');
}

export function getAdminSources() {
  return adminApi<{ items: AdminSourceItem[] }>('/api/admin/sources');
}

export function getAdminAuditLog() {
  return adminApi<{ items: AdminAuditLogItem[] }>('/api/admin/audit-log');
}
