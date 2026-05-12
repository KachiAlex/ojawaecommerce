/**
 * Mobile Touch Fix Utility
 * Ensures all interactive elements work properly on mobile devices
 */

export const setupMobileTouchFix = () => {
  if (typeof window === 'undefined') return;

  // Only run on mobile devices
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth <= 768;

  if (!isMobile) return;

  // Fix for all buttons
  const fixButtons = () => {
    const buttons = document.querySelectorAll('button, a[href], [role="button"], [onclick]');
    buttons.forEach((button) => {
      // Ensure pointer events are enabled
      button.style.pointerEvents = 'auto';
      button.style.touchAction = 'manipulation';
      button.style.WebkitTapHighlightColor = 'transparent';
      button.style.cursor = 'pointer';
      
      // Add touch event listeners if not present
      if (!button.dataset.touchFixed) {
        button.dataset.touchFixed = 'true';
        
        // Prevent default touch behavior that might interfere
        button.addEventListener('touchstart', (e) => {
          e.stopPropagation();
        }, { passive: true });
        
        button.addEventListener('touchend', (e) => {
          e.stopPropagation();
        }, { passive: true });
      }
    });
  };

  // Fix for React Router Links
  const fixLinks = () => {
    const links = document.querySelectorAll('a[href]');
    links.forEach((link) => {
      link.style.pointerEvents = 'auto';
      link.style.touchAction = 'manipulation';
      link.style.WebkitTapHighlightColor = 'transparent';
    });
  };

  // Run fixes immediately
  fixButtons();
  fixLinks();

  // Run fixes after DOM updates
  const observer = new MutationObserver(() => {
    fixButtons();
    fixLinks();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Also run on route changes (for React Router)
  const originalPushState = history.pushState;
  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    setTimeout(() => {
      fixButtons();
      fixLinks();
    }, 100);
  };

  return () => {
    observer.disconnect();
    history.pushState = originalPushState;
  };
};

export default setupMobileTouchFix;

