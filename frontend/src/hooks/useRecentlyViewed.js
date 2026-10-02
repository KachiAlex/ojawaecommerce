import { useState, useCallback, useEffect } from 'react';
import { recentlyViewedService } from '../services/recentlyViewed';

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const refresh = useCallback(() => {
    setRecentlyViewed(recentlyViewedService.getAll());
  }, []);

  const addProduct = useCallback((product) => {
    const updated = recentlyViewedService.add(product);
    setRecentlyViewed(updated);
  }, []);

  const clear = useCallback(() => {
    recentlyViewedService.clear();
    setRecentlyViewed([]);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { recentlyViewed, addProduct, clear, refresh };
}
