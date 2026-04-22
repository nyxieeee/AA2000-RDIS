const DEFAULT_API_BASE_URL = 'https://desktop-0iik0rk.tail20a759.ts.net';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
export const API_URL = (import.meta.env.DEV || (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('capacitor'))) ? '/api' : API_BASE_URL;

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('aa2000-auth-token');

  const headers: Record<string, string> = {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  // Only set Content-Type to application/json if it's not already set and body is not FormData
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: `Request failed (${response.status} ${response.statusText})` }));
    throw new Error(error.error || error.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}
