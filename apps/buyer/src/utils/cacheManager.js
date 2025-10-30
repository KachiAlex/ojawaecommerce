/**
 * Cache Manager Utility
 * Provides functions to manage service worker caches
 */

/**
 * Clear all application caches
 * @returns {Promise<boolean>} Success status
 */
export const clearAllCaches = async () => {
  try {
    // Clear service worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('✅ All caches cleared');
    }

    // Send message to service worker to clear its caches
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    }

    // Clear localStorage (except critical items)
    const criticalKeys = ['cart', 'auth'];
    Object.keys(localStorage).forEach(key => {
      if (!criticalKeys.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage
    sessionStorage.clear();

    return true;
  } catch (error) {
    console.error('❌ Failed to clear caches:', error);
    return false;
  }
};

/**
 * Force reload the page with cache bypass
 */
export const hardReload = () => {
  if (window.location.reload) {
    // Force reload from server, bypassing cache
    window.location.reload(true);
  } else {
    // Fallback: add timestamp to force reload
    window.location.href = window.location.href + '?v=' + Date.now();
  }
};

/**
 * Clear caches and reload
 */
export const clearCachesAndReload = async () => {
  await clearAllCaches();
  setTimeout(() => {
    hardReload();
  }, 500);
};

/**
 * Check if service worker is registered and active
 */
export const isServiceWorkerActive = () => {
  return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
};

/**
 * Unregister all service workers
 */
export const unregisterServiceWorkers = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => registration.unregister())
      );
      console.log('✅ All service workers unregistered');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Failed to unregister service workers:', error);
    return false;
  }
};

/**
 * Get cache size information
 */
export const getCacheInfo = async () => {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const cacheInfo = [];
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        cacheInfo.push({
          name: cacheName,
          entries: keys.length
        });
      }
      
      return cacheInfo;
    }
    return [];
  } catch (error) {
    console.error('❌ Failed to get cache info:', error);
    return [];
  }
};

/**
 * Check for service worker updates
 */
export const checkForUpdates = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        console.log('✅ Checked for service worker updates');
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('❌ Failed to check for updates:', error);
    return false;
  }
};

export default {
  clearAllCaches,
  hardReload,
  clearCachesAndReload,
  isServiceWorkerActive,
  unregisterServiceWorkers,
  getCacheInfo,
  checkForUpdates
};

