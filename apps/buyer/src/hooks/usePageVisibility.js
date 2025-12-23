import { useEffect, useState } from 'react';

/**
 * Tracks whether the current document/tab is visible.
 * Falls back to true in non-browser environments to avoid SSR mismatches.
 */
export const usePageVisibility = () => {
  const getIsVisible = () => {
    if (typeof document === 'undefined') return true;
    return document.visibilityState !== 'hidden';
  };

  const [isVisible, setIsVisible] = useState(getIsVisible);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState !== 'hidden');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
};

export default usePageVisibility;
