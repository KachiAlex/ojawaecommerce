import { config } from '../config/env';

const trimTrailingSlash = (value = '') => value.replace(/\/$/, '');

export const getApiBaseUrl = () => {
  const configured = trimTrailingSlash(config?.app?.apiBaseUrl || '');
  if (configured) return configured;
  if (typeof window !== 'undefined') return trimTrailingSlash(window.location.origin);
  return '';
};

export const buildApiUrl = (path) => {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

export const apiPost = async (path, payload, { token, headers = {} } = {}) => {
  const response = await fetch(buildApiUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: JSON.stringify(payload || {}),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = json?.error?.message || json?.error || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return json;
};

export const apiPostWithAuth = async (path, payload, user, options = {}) => {
  if (user?.getIdToken) {
    const token = await user.getIdToken();
    return apiPost(path, payload, { ...options, token });
  }

  // Session-backed auth is the default after the backend migration.
  return apiPost(path, payload, options);
};
