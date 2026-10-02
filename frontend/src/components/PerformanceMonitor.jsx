import { useEffect, useState } from 'react';

const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    // Only run once on mount
    let observers = [];

    // Monitor Core Web Vitals
    const measurePerformance = () => {
      // First Contentful Paint (FCP)
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              console.log('🎨 FCP:', entry.startTime.toFixed(2), 'ms');
              setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
            }
          }
        });
        observer.observe({ entryTypes: ['paint'] });
        observers.push(observer);
      }

      // Largest Contentful Paint (LCP)
      if ('PerformanceObserver' in window) {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          console.log('🖼️ LCP:', lastEntry.startTime.toFixed(2), 'ms');
          setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        observers.push(lcpObserver);
      }

      // Cumulative Layout Shift (CLS)
      if ('PerformanceObserver' in window) {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          console.log('📐 CLS:', clsValue.toFixed(4));
          setMetrics(prev => ({ ...prev, cls: clsValue }));
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        observers.push(clsObserver);
      }

      // First Input Delay (FID)
      if ('PerformanceObserver' in window) {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            console.log('⚡ FID:', entry.processingStart - entry.startTime, 'ms');
            setMetrics(prev => ({ ...prev, fid: entry.processingStart - entry.startTime }));
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        observers.push(fidObserver);
      }
    };

    // Monitor resource loading
    const monitorResources = () => {
      if ('PerformanceObserver' in window) {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 1000) { // Log slow resources
              console.warn('🐌 Slow resource:', entry.name, entry.duration.toFixed(2), 'ms');
            }
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        observers.push(resourceObserver);
      }
    };

    // Monitor navigation timing - only once
    const monitorNavigation = () => {
      const [navigation] = performance.getEntriesByType('navigation');
      if (navigation) {
        const loadTime = navigation.duration;
        const domReady = navigation.domContentLoadedEventEnd;
        
        console.log('⏱️ Page Load Time:', loadTime, 'ms');
        console.log('⏱️ DOM Ready:', domReady, 'ms');
        
        setMetrics(prev => ({ 
          ...prev, 
          loadTime, 
          domReady 
        }));
      }
    };

    // Run monitoring
    measurePerformance();
    monitorResources();
    
    // Monitor navigation after page load - only once
    if (document.readyState === 'complete') {
      monitorNavigation();
    } else {
      const handleLoad = () => {
        monitorNavigation();
        window.removeEventListener('load', handleLoad);
      };
      window.addEventListener('load', handleLoad);
    }

    // Cleanup function
    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, []); // Empty dependency array - only run once

  // Don't render anything - this is just for monitoring
  return null;
};

export default PerformanceMonitor;
