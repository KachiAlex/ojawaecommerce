// Performance monitoring utilities
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
  }

  // Measure component render time
  measureRender(componentName, renderFn) {
    const start = performance.now();
    const result = renderFn();
    const end = performance.now();
    
    const renderTime = end - start;
    this.metrics.set(`render_${componentName}`, renderTime);
    
    if (renderTime > 100) { // Warn if render takes > 100ms
      console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
    
    return result;
  }

  // Measure async operations
  async measureAsync(operationName, asyncFn) {
    const start = performance.now();
    try {
      const result = await asyncFn();
      const end = performance.now();
      const duration = end - start;
      
      this.metrics.set(`async_${operationName}`, duration);
      
      if (duration > 1000) { // Warn if operation takes > 1s
        console.warn(`Slow async operation: ${operationName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const end = performance.now();
      const duration = end - start;
      this.metrics.set(`async_${operationName}_error`, duration);
      throw error;
    }
  }

  // Monitor bundle loading
  measureBundleLoad(bundleName) {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const entries = performance.getEntriesByType('resource');
      const bundleEntry = entries.find(entry => 
        entry.name.includes(bundleName) || entry.name.includes('chunk')
      );
      
      if (bundleEntry) {
        this.metrics.set(`bundle_${bundleName}`, bundleEntry.duration);
      }
    }
  }

  // Monitor memory usage (if available)
  measureMemory() {
    if ('memory' in performance) {
      const memory = performance.memory;
      this.metrics.set('memory_used', memory.usedJSHeapSize);
      this.metrics.set('memory_total', memory.totalJSHeapSize);
      this.metrics.set('memory_limit', memory.jsHeapSizeLimit);
      
      const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      if (usagePercentage > 80) {
        console.warn(`High memory usage: ${usagePercentage.toFixed(2)}%`);
      }
    }
  }

  // Get performance report
  getReport() {
    return {
      metrics: Object.fromEntries(this.metrics),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null
    };
  }

  // Clear old metrics
  clearMetrics() {
    this.metrics.clear();
  }

  // Monitor Core Web Vitals
  observeWebVitals() {
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.metrics.set('lcp', lastEntry.startTime);
          
          if (lastEntry.startTime > 2500) {
            console.warn(`Poor LCP: ${lastEntry.startTime.toFixed(2)}ms`);
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);
      } catch (e) {
        console.warn('LCP monitoring not supported');
      }

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.metrics.set('fid', entry.processingStart - entry.startTime);
            
            if (entry.processingStart - entry.startTime > 100) {
              console.warn(`Poor FID: ${entry.processingStart - entry.startTime}ms`);
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', fidObserver);
      } catch (e) {
        console.warn('FID monitoring not supported');
      }

      // Cumulative Layout Shift
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.metrics.set('cls', clsValue);
          
          if (clsValue > 0.1) {
            console.warn(`Poor CLS: ${clsValue.toFixed(4)}`);
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', clsObserver);
      } catch (e) {
        console.warn('CLS monitoring not supported');
      }
    }
  }

  // Cleanup observers
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Create global instance
const performanceMonitor = new PerformanceMonitor();

// Auto-start monitoring in production
if (process.env.NODE_ENV === 'production') {
  performanceMonitor.observeWebVitals();
  
  // Monitor memory every 30 seconds
  setInterval(() => {
    performanceMonitor.measureMemory();
  }, 30000);
}

export default performanceMonitor;
