import type { ApiResponse } from '../app-types';

export type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  last_login_at: string | null;
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
