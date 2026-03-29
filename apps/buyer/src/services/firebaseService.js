// REST-backed replacement for previous Firebase service.
// Routes data and auth operations to the Render backend under `/api/*`.

const api = {
  async request(path, options = {}) {
    const res = await fetch(path, {
      credentials: 'include',
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      ...options,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`API ${path} failed: ${res.status} ${res.statusText} ${text}`);
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.text();
  },
};

export const authService = {
  async signin(email, password) {
    const res = await api.request('/api/auth/signin', { method: 'POST', body: JSON.stringify({ email, password }), headers: { 'Content-Type': 'application/json' } });
    return res;
  },
  async signup(email, password, profile = {}) {
    const res = await api.request('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, profile }), headers: { 'Content-Type': 'application/json' } });
    return res;
  },
  async signout() {
    await api.request('/api/auth/signout', { method: 'POST' });
    return true;
  },
  async sendPasswordReset(email) {
    await api.request('/api/auth/password-reset', { method: 'POST', body: JSON.stringify({ email }), headers: { 'Content-Type': 'application/json' } });
    return true;
  },
  async getProfile(userId) {
    const res = await api.request(`/api/users/${encodeURIComponent(userId)}`);
    return res || null;
  }
};

export const productService = {
  async getAll(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const res = await api.request(`/api/products?${params}`);
    return res.items || [];
  },
  async getById(id) {
    const res = await api.request(`/api/products/${encodeURIComponent(id)}`);
    return res || null;
  }
};

export const orderService = {
  async create(order) {
    const res = await api.request('/api/orders', { method: 'POST', body: JSON.stringify(order), headers: { 'Content-Type': 'application/json' } });
    return res || null;
  },
  async getById(id) {
    const res = await api.request(`/api/orders/${encodeURIComponent(id)}`);
    return res || null;
  },
  async getByUser(userId, type = 'buyer') {
    const res = await api.request(`/api/users/${encodeURIComponent(userId)}/orders?type=${encodeURIComponent(type)}`);
    return res.items || [];
  }
};

export const walletService = {
  async createWallet(userId, userType) {
    const res = await api.request('/api/wallets', { method: 'POST', body: JSON.stringify({ userId, userType }), headers: { 'Content-Type': 'application/json' } });
    return res || null;
  },
  async getUserWallet(userId) {
    const res = await api.request(`/api/users/${encodeURIComponent(userId)}/wallet`);
    return res || null;
  }
};

export default {
  auth: authService,
  product: productService,
  order: orderService,
  wallet: walletService,
};
