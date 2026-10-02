import { config } from '../config/env';

const AUTH_TOKEN_KEY = 'authToken';

export class ApiError extends Error {
  constructor(message, { status = 0, code = '', data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export const getStoredAuthToken = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.warn('Unable to read auth token from storage:', error);
    return null;
  }
};

export const api = {
  async request(path, options = {}) {
    const baseUrl = config.app.apiBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');

    const fullPath = path.startsWith('http') ? path : `${baseUrl}${path}`;

    const token = getStoredAuthToken();
    const isFormData = options.body && options.body instanceof FormData;
    const mergedHeaders = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const res = await fetch(fullPath, {
      ...options,
      headers: mergedHeaders,
    });

    if (!res.ok) {
      let errorData = null;
      let message = `API ${path} failed: ${res.status}`;
      try {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          errorData = await res.json();
          message = errorData.error || errorData.message || message;
        } else {
          const text = await res.text();
          if (text) message = text;
        }
      } catch { /* ignore parse errors */ }

      throw new ApiError(message, {
        status: res.status,
        code: errorData?.code || '',
        data: errorData,
      });
    }

    return await res.json();
  }
};

export { config };
