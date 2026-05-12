// Bundle Analysis Utility
export const analyzeBundle = () => {
  if (typeof window === 'undefined') return;

  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  
  console.group('📦 Bundle Analysis');
  
  // Analyze scripts
  console.group('📜 JavaScript Files');
  scripts.forEach(script => {
    const src = script.src;
    const size = script.getAttribute('data-size') || 'Unknown';
    console.log(`${src} - ${size}`);
  });
  console.groupEnd();
  
  // Analyze stylesheets
  console.group('🎨 CSS Files');
  stylesheets.forEach(link => {
    const href = link.href;
    const size = link.getAttribute('data-size') || 'Unknown';
    console.log(`${href} - ${size}`);
  });
  console.groupEnd();
  
  // Performance metrics
  if (window.performance && window.performance.getEntriesByType) {
    const resources = window.performance.getEntriesByType('resource');
    const jsResources = resources.filter(r => r.name.includes('.js'));
    const cssResources = resources.filter(r => r.name.includes('.css'));
    
    console.group('⚡ Performance Metrics');
    console.log(`Total JS files: ${jsResources.length}`);
    console.log(`Total CSS files: ${cssResources.length}`);
    console.log(`Total resources: ${resources.length}`);
    
    const totalSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    console.log(`Total transfer size: ${(totalSize / 1024).toFixed(2)} KB`);
    console.groupEnd();
  }
  
  console.groupEnd();
};

// Auto-analyze on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(analyzeBundle, 1000);
  });
}
