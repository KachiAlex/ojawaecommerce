import { config } from './api';

export const uploadService = {
  async uploadLogo(file) {
    const form = new FormData();
    form.append('file', file);
    const baseUrl = config?.app?.apiBaseUrl || window.location.origin;
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('authToken') : null;
    const res = await fetch(`${baseUrl}/api/uploads/logo`, { method: 'POST', credentials: 'include', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: form });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`upload failed: ${res.status} ${res.statusText} ${text}`);
    }
    return res.json();
  }
};
