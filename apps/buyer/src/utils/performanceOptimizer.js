import { memo } from 'react'

// Performance optimization utilities
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
};

export const throttle = (func, limit) => {
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
};

// Image lazy loading utility
export const lazyLoadImage = (img, src) => {
  const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
        img.src = src;
        observer.unobserve(img);
        }
      });
    });
  observer.observe(img);
};

// Component memoization helper
export const memoizeComponent = (Component, propsAreEqual) => {
  return memo(Component, propsAreEqual);
};

// Bundle size analyzer
export const analyzeBundleSize = () => {
    if (process.env.NODE_ENV === 'development') {
    console.log('📊 Bundle Analysis:');
    console.log('- Consider code splitting for large components');
    console.log('- Use dynamic imports for heavy libraries');
    console.log('- Implement lazy loading for routes');
  }
};