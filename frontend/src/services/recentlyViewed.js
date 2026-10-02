const KEY = '__recently_viewed__';
const MAX_ITEMS = 12;

export const recentlyViewedService = {
  getAll() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  add(product) {
    if (!product || !product.id) return this.getAll();
    const items = this.getAll().filter(i => i.id !== product.id);
    const entry = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image || (Array.isArray(product.images) ? product.images[0] : null),
      category: product.category,
      viewedAt: new Date().toISOString(),
    };
    items.unshift(entry);
    const trimmed = items.slice(0, MAX_ITEMS);
    try {
      localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch { /* ignore */ }
    return trimmed;
  },

  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch { /* ignore */ }
  },
};
