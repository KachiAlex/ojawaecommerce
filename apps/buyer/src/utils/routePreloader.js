/**
 * Route Preloader Utility
 * Preloads lazy-loaded components on hover to improve perceived performance
 */

// Store preloaded components to avoid duplicate loads
const preloadedComponents = new Set();

/**
 * Preload a lazy-loaded component
 * @param {Function} lazyComponent - The lazy component to preload
 * @param {string} componentName - Name for logging/tracking
 */
export const preloadComponent = (lazyComponent, componentName = 'Unknown') => {
  if (preloadedComponents.has(componentName)) {
    console.log(`✅ Component already preloaded: ${componentName}`);
    return Promise.resolve();
  }

  console.log(`🔄 Preloading component: ${componentName}`);
  
  // Call the lazy component to trigger the import
  const promise = lazyComponent._payload?._result || lazyComponent._init?.(lazyComponent._payload);
  
  if (promise && promise.then) {
    return promise
      .then(() => {
        preloadedComponents.add(componentName);
        console.log(`✅ Component preloaded: ${componentName}`);
      })
      .catch((error) => {
        console.warn(`⚠️ Failed to preload component ${componentName}:`, error);
      });
  }
  
  return Promise.resolve();
};

/**
 * Create a hover handler for link preloading
 * @param {Function} lazyComponent - The lazy component to preload
 * @param {string} componentName - Name for logging/tracking
 * @returns {Function} - Hover event handler
 */
export const createPreloadHandler = (lazyComponent, componentName) => {
  return () => preloadComponent(lazyComponent, componentName);
};

/**
 * Preload multiple components at once
 * @param {Array} components - Array of {component, name} objects
 */
export const preloadComponents = (components) => {
  return Promise.all(
    components.map(({ component, name }) => preloadComponent(component, name))
  );
};

/**
 * Check if a component is already preloaded
 * @param {string} componentName - Name of the component
 * @returns {boolean}
 */
export const isPreloaded = (componentName) => {
  return preloadedComponents.has(componentName);
};

/**
 * Clear preloaded components cache (useful for testing)
 */
export const clearPreloadCache = () => {
  preloadedComponents.clear();
  console.log('🧹 Preload cache cleared');
};

export default {
  preloadComponent,
  createPreloadHandler,
  preloadComponents,
  isPreloaded,
  clearPreloadCache
};

