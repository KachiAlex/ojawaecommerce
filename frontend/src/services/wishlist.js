export const wishlistService = {
  _key(userId) {
    return `__wishlist__${userId}`;
  },
  _read(userId) {
    try {
      const raw = localStorage.getItem(this._key(userId));
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },
  _write(userId, items) {
    try {
      localStorage.setItem(this._key(userId), JSON.stringify(items));
    } catch (e) { /* ignore */ }
  },
  async isInWishlist(userId, productId) {
    if (!userId || !productId) return false;
    const items = this._read(userId);
    return items.some(i => i.productId === productId || i.id === productId);
  },
  async addToWishlist(userId, productId, payload = {}) {
    if (!userId || !productId) return false;
    const items = this._read(userId);
    if (items.some(i => i.productId === productId || i.id === productId)) return true;
    const entry = { id: productId, productId, ...payload, addedAt: new Date().toISOString() };
    items.push(entry);
    this._write(userId, items);
    return true;
  },
  async removeFromWishlist(userId, productId) {
    if (!userId || !productId) return false;
    const items = this._read(userId).filter(i => i.productId !== productId && i.id !== productId);
    this._write(userId, items);
    return true;
  },
  async getWishlist(userId) {
    if (!userId) return [];
    return this._read(userId);
  }
};
