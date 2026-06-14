import type { ApiResponse } from './app-types';

export async function readApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.success) throw new Error(`API request failed: ${url}`);
  return payload.data;
}
