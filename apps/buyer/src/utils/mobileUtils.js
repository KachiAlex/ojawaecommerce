// Mobile utility functions and constants
export const MOBILE_BREAKPOINTS = {
  xs: '320px',   // Extra small devices
  sm: '640px',   // Small devices
  md: '768px',   // Medium devices
  lg: '1024px',  // Large devices
  xl: '1280px',  // Extra large devices
  '2xl': '1536px' // 2X large devices
}

export const MOBILE_CONFIG = {
  touchTargetSize: 44, // Minimum touch target size in pixels
  swipeThreshold: 50,  // Minimum swipe distance in pixels
  longPressDelay: 500, // Long press delay in milliseconds
  scrollDebounceDelay: 100, // Scroll event debounce delay
  viewportUnits: {
    vh: '1vh',
    vw: '1vw',
    vmin: '1vmin',
    vmax: '1vmax'
  }
}

// Device detection utilities
export const deviceDetection = {
  // Check if device is mobile
  isMobile: () => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  },

  // Check if device is tablet
  isTablet: () => {
    if (typeof window === 'undefined') return false
    return window.innerWidth >= 768 && window.innerWidth < 1024
  },

  // Check if device is desktop
  isDesktop: () => {
    if (typeof window === 'undefined') return false
    return window.innerWidth >= 1024
  },

  // Check if device supports touch
  isTouchDevice: () => {
    if (typeof window === 'undefined') return false
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  },

  // Get device type
  getDeviceType: () => {
    if (typeof window === 'undefined') return 'unknown'
    
    const width = window.innerWidth
    if (width < 640) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  },

  // Check if device is iOS
  isIOS: () => {
    if (typeof window === 'undefined') return false
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
  },

  // Check if device is Android
  isAndroid: () => {
    if (typeof window === 'undefined') return false
    return /Android/.test(navigator.userAgent)
  }
}

// Touch gesture utilities
export const touchGestures = {
  // Detect swipe direction
  detectSwipe: (startX, startY, endX, endY, threshold = MOBILE_CONFIG.swipeThreshold) => {
    const deltaX = endX - startX
    const deltaY = endY - startY
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    if (absDeltaX > threshold || absDeltaY > threshold) {
      if (absDeltaX > absDeltaY) {
        return deltaX > 0 ? 'right' : 'left'
      } else {
        return deltaY > 0 ? 'down' : 'up'
      }
    }
    return null
  },

  // Get touch coordinates
  getTouchCoordinates: (event) => {
    const touch = event.touches[0] || event.changedTouches[0]
    return {
      x: touch.clientX,
      y: touch.clientY
    }
  },

  // Prevent default touch behavior
  preventDefaultTouch: (event) => {
    event.preventDefault()
  }
}

// Responsive design utilities
export const responsiveUtils = {
  // Get responsive class based on device type
  getResponsiveClass: (baseClass, mobileClass, tabletClass, desktopClass) => {
    const deviceType = deviceDetection.getDeviceType()
    
    switch (deviceType) {
      case 'mobile':
        return mobileClass || baseClass
      case 'tablet':
        return tabletClass || baseClass
      case 'desktop':
        return desktopClass || baseClass
      default:
        return baseClass
    }
  },

  // Get grid columns based on device type
  getGridColumns: () => {
    const deviceType = deviceDetection.getDeviceType()
    
    switch (deviceType) {
      case 'mobile':
        return 1
      case 'tablet':
        return 2
      case 'desktop':
        return 3
      default:
        return 2
    }
  },

  // Get modal size based on device type
  getModalSize: () => {
    const deviceType = deviceDetection.getDeviceType()
    
    switch (deviceType) {
      case 'mobile':
        return 'w-full h-full max-w-none max-h-none'
      case 'tablet':
        return 'w-11/12 max-w-2xl'
      case 'desktop':
        return 'w-1/2 max-w-4xl'
      default:
        return 'w-11/12 max-w-2xl'
    }
  }
}

// Performance utilities for mobile
export const mobilePerformance = {
  // Debounce function for scroll events
  debounce: (func, wait) => {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  },

  // Throttle function for resize events
  throttle: (func, limit) => {
    let inThrottle
    return function() {
      const args = arguments
      const context = this
      if (!inThrottle) {
        func.apply(context, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  },

  // Lazy load images
  lazyLoadImage: (imgElement, src) => {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            imgElement.src = src
            observer.unobserve(imgElement)
          }
        })
      })
      observer.observe(imgElement)
    } else {
      // Fallback for older browsers
      imgElement.src = src
    }
  },

  // Preload critical resources
  preloadResource: (href, as = 'style') => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = href
    link.as = as
    document.head.appendChild(link)
  }
}

// Accessibility utilities for mobile
export const mobileAccessibility = {
  // Ensure minimum touch target size
  ensureTouchTarget: (element) => {
    if (element) {
      const rect = element.getBoundingClientRect()
      const minSize = MOBILE_CONFIG.touchTargetSize
      
      if (rect.width < minSize || rect.height < minSize) {
        element.style.minWidth = `${minSize}px`
        element.style.minHeight = `${minSize}px`
      }
    }
  },

  // Add touch feedback
  addTouchFeedback: (element, feedbackClass = 'active:bg-gray-100') => {
    if (element && deviceDetection.isTouchDevice()) {
      element.classList.add(feedbackClass)
    }
  },

  // Handle focus for touch devices
  handleTouchFocus: (element) => {
    if (element && deviceDetection.isTouchDevice()) {
      element.addEventListener('touchstart', () => {
        element.focus()
      })
    }
  }
}

// Viewport utilities
export const viewportUtils = {
  // Get viewport height (accounting for mobile browser UI)
  getViewportHeight: () => {
    if (typeof window === 'undefined') return 0
    
    // Use visual viewport if available (better for mobile)
    if (window.visualViewport) {
      return window.visualViewport.height
    }
    
    return window.innerHeight
  },

  // Get viewport width
  getViewportWidth: () => {
    if (typeof window === 'undefined') return 0
    
    if (window.visualViewport) {
      return window.visualViewport.width
    }
    
    return window.innerWidth
  },

  // Set viewport meta tag
  setViewportMeta: (options = {}) => {
    if (typeof document === 'undefined') return

    const defaultOptions = {
      width: 'device-width',
      initialScale: 1,
      maximumScale: 1,
      userScalable: 'no',
      viewportFit: 'cover'
    }

    const viewportOptions = { ...defaultOptions, ...options }
    
    let viewportMeta = document.querySelector('meta[name="viewport"]')
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta')
      viewportMeta.name = 'viewport'
      document.head.appendChild(viewportMeta)
    }

    const content = Object.entries(viewportOptions)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ')

    viewportMeta.content = content
  }
}

// Mobile-specific CSS classes
export const mobileClasses = {
  // Safe area classes for devices with notches
  safeArea: {
    top: 'pt-safe-top',
    bottom: 'pb-safe-bottom',
    left: 'pl-safe-left',
    right: 'pr-safe-right',
    all: 'pt-safe-top pb-safe-bottom pl-safe-left pr-safe-right'
  },

  // Touch-friendly button classes
  touchButton: 'min-h-[44px] min-w-[44px] touch-manipulation select-none',
  
  // Mobile-optimized spacing
  spacing: {
    mobile: 'px-4 py-3',
    tablet: 'px-6 py-4',
    desktop: 'px-8 py-6'
  },

  // Mobile grid classes
  grid: {
    mobile: 'grid-cols-1 gap-4',
    tablet: 'grid-cols-2 gap-6',
    desktop: 'grid-cols-3 gap-8'
  },

  // Mobile text sizes
  text: {
    mobile: 'text-sm',
    tablet: 'text-base',
    desktop: 'text-lg'
  }
}

// Export all utilities
export default {
  MOBILE_BREAKPOINTS,
  MOBILE_CONFIG,
  deviceDetection,
  touchGestures,
  responsiveUtils,
  mobilePerformance,
  mobileAccessibility,
  viewportUtils,
  mobileClasses
}
