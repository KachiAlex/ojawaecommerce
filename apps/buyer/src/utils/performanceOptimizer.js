// Performance optimization utilities
export const performanceOptimizer = {
  // Debounce function for search and input
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function for scroll events
  throttle: (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Image lazy loading
  lazyLoadImages: () => {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  },

  // Preload critical resources
  preloadCriticalResources: () => {
    const criticalResources = [
      '/icons/icon-192x192.png',
      '/icons/icon-512x512.png',
      '/manifest.json'
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = resource.endsWith('.json') ? 'fetch' : 'image';
      document.head.appendChild(link);
    });
  },

  // Optimize Firebase queries
  optimizeFirestoreQuery: (query, options = {}) => {
    const { limit: queryLimit = 20, orderBy: orderField = 'createdAt', orderDirection = 'desc' } = options;
    
    return query
      .orderBy(orderField, orderDirection)
      .limit(queryLimit);
  },

  // Cache management
  cacheManager: {
    set: (key, value, ttl = 300000) => { // 5 minutes default
      const item = {
        value,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(`cache_${key}`, JSON.stringify(item));
    },

    get: (key) => {
      const item = localStorage.getItem(`cache_${key}`);
      if (!item) return null;

      const parsed = JSON.parse(item);
      const now = Date.now();
      
      if (now - parsed.timestamp > parsed.ttl) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }
      
      return parsed.value;
    },

    clear: (pattern = '') => {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cache_') && key.includes(pattern)) {
          localStorage.removeItem(key);
        }
      });
    }
  },

  // Bundle analyzer helper
  analyzeBundle: () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Bundle analysis available in development mode');
      // Add bundle analysis logic here
    }
  },

  // Memory management
  memoryManager: {
    cleanup: () => {
      // Clear unused event listeners
      const elements = document.querySelectorAll('[data-cleanup]');
      elements.forEach(el => {
        el.removeEventListener('scroll', () => {});
        el.removeEventListener('resize', () => {});
      });
    },

    monitor: () => {
      if ('memory' in performance) {
        const memory = performance.memory;
        console.log('Memory usage:', {
          used: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
          total: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
          limit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB'
        });
      }
    }
  },

  // Service Worker optimization
  swOptimization: {
    register: async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('SW registered: ', registration);
          return registration;
        } catch (error) {
          console.log('SW registration failed: ', error);
        }
      }
    },

    update: async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          registration.update();
        }
      }
    }
  }
};

export default performanceOptimizer;
