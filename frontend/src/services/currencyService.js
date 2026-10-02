import { api } from './api';

export const currencyService = {
  async getRates() {
    const res = await api.request('/api/currency/rates');
    return res.data;
  },

  async convert(amount, from, to) {
    const params = new URLSearchParams({ amount: String(amount), from, to });
    const res = await api.request(`/api/currency/convert?${params}`);
    return res.data;
  },

  async detectFromCountry(country) {
    const params = new URLSearchParams({ country });
    const res = await api.request(`/api/currency/detect?${params}`);
    return res.data;
  },
};
