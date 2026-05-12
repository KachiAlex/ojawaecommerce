import { useState, useEffect, useCallback, useRef } from 'react'
import { deviceDetection, mobilePerformance, viewportUtils } from '../utils/mobileUtils'

export const useMobileOptimization = () => {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [orientation, setOrientation] = useState('portrait')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [connectionType, setConnectionType] = useState('unknown')
  
  const resizeTimeout = useRef(null)
  const orientationTimeout = useRef(null)

  // Handle device detection
  const updateDeviceInfo = useCallback(() => {
    setIsMobile(deviceDetection.isMobile())
    setIsTablet(deviceDetection.isTablet())
    setIsDesktop(deviceDetection.isDesktop())
    
    const width = viewportUtils.getViewportWidth()
    const height = viewportUtils.getViewportHeight()
    setViewportSize({ width, height })
    
    setOrientation(width > height ? 'landscape' : 'portrait')
  }, [])

  // Handle network status
  const updateNetworkStatus = useCallback(() => {
    setIsOnline(navigator.onLine)
    
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      if (connection) {
        setConnectionType(connection.effectiveType || connection.type || 'unknown')
      }
    }
  }, [])

  // Debounced resize handler
  const handleResize = useCallback(() => {
    if (resizeTimeout.current) {
      clearTimeout(resizeTimeout.current)
    }
    
    resizeTimeout.current = setTimeout(() => {
      updateDeviceInfo()
    }, 100)
  }, [updateDeviceInfo])

  // Debounced orientation change handler
  const handleOrientationChange = useCallback(() => {
    if (orientationTimeout.current) {
      clearTimeout(orientationTimeout.current)
    }
    
    orientationTimeout.current = setTimeout(() => {
      updateDeviceInfo()
    }, 500) // Longer delay for orientation changes
  }, [updateDeviceInfo])

  // Network status handlers
  const handleOnline = useCallback(() => setIsOnline(true), [])
  const handleOffline = useCallback(() => setIsOnline(false), [])

  // Connection change handler
  const handleConnectionChange = useCallback(() => {
    updateNetworkStatus()
  }, [updateNetworkStatus])

  // Setup event listeners
  useEffect(() => {
    // Initial setup
    updateDeviceInfo()
    updateNetworkStatus()

    // Window events
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Visual viewport events (for mobile browsers)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
    }

    // Connection events
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      if (connection) {
        connection.addEventListener('change', handleConnectionChange)
      }
    }

    return () => {
      // Cleanup
      if (resizeTimeout.current) {
        clearTimeout(resizeTimeout.current)
      }
      if (orientationTimeout.current) {
        clearTimeout(orientationTimeout.current)
      }

      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)

      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize)
      }

      if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
        if (connection) {
          connection.removeEventListener('change', handleConnectionChange)
        }
      }
    }
  }, [
    handleResize,
    handleOrientationChange,
    handleOnline,
    handleOffline,
    handleConnectionChange,
    updateDeviceInfo,
    updateNetworkStatus
  ])

  // Performance optimization utilities
  const optimizeForDevice = useCallback(() => {
    const optimizations = {
      isMobile,
      isTablet,
      isDesktop,
      viewportSize,
      orientation,
      isOnline,
      connectionType
    }

    // Mobile-specific optimizations
    if (isMobile) {
      // Reduce animations on slow connections
      if (connectionType === 'slow-2g' || connectionType === '2g') {
        document.documentElement.style.setProperty('--animation-duration', '0.1s')
      }

      // Optimize images based on connection
      if (connectionType === 'slow-2g' || connectionType === '2g') {
        document.documentElement.style.setProperty('--image-quality', 'low')
      }
    }

    return optimizations
  }, [isMobile, isTablet, isDesktop, viewportSize, orientation, isOnline, connectionType])

  // Lazy loading utility
  const createLazyLoader = useCallback((threshold = 0.1) => {
    if (!('IntersectionObserver' in window)) {
      return null
    }

    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target
            const src = element.dataset.src
            if (src) {
              element.src = src
              element.removeAttribute('data-src')
            }
            observer.unobserve(element)
          }
        })
      },
      {
        threshold,
        rootMargin: '50px'
      }
    )
  }, [])

  // Preload critical resources
  const preloadResource = useCallback((href, as = 'style') => {
    if (!isOnline) return

    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = href
    link.as = as
    document.head.appendChild(link)
  }, [isOnline])

  // Optimize images based on device and connection
  const getOptimizedImageUrl = useCallback((originalUrl, options = {}) => {
    if (!originalUrl) return originalUrl

    const { width, height, quality = 80 } = options

    // For mobile devices, use smaller images
    if (isMobile && !options.forceHighQuality) {
      const mobileWidth = Math.min(width || 400, 400)
      return `${originalUrl}?w=${mobileWidth}&q=${quality}`
    }

    // For tablet devices
    if (isTablet && !options.forceHighQuality) {
      const tabletWidth = Math.min(width || 600, 600)
      return `${originalUrl}?w=${tabletWidth}&q=${quality}`
    }

    // For desktop or high-quality requests
    return `${originalUrl}?w=${width || 800}&q=${quality}`
  }, [isMobile, isTablet])

  // Debounce utility for performance
  const debounce = useCallback((func, wait) => {
    return mobilePerformance.debounce(func, wait)
  }, [])

  // Throttle utility for performance
  const throttle = useCallback((func, limit) => {
    return mobilePerformance.throttle(func, limit)
  }, [])

  // Get device-specific grid columns
  const getGridColumns = useCallback(() => {
    if (isMobile) return 2
    if (isTablet) return 3
    return 4
  }, [isMobile, isTablet])

  // Get device-specific spacing
  const getSpacing = useCallback(() => {
    if (isMobile) return { padding: 'px-4 py-3', margin: 'mx-4 my-3' }
    if (isTablet) return { padding: 'px-6 py-4', margin: 'mx-6 my-4' }
    return { padding: 'px-8 py-6', margin: 'mx-8 my-6' }
  }, [isMobile, isTablet])

  // Check if device supports touch
  const supportsTouch = deviceDetection.isTouchDevice()

  // Check if device is iOS
  const isIOS = deviceDetection.isIOS()

  // Check if device is Android
  const isAndroid = deviceDetection.isAndroid()

  return {
    // Device info
    isMobile,
    isTablet,
    isDesktop,
    isIOS,
    isAndroid,
    supportsTouch,
    
    // Viewport info
    viewportSize,
    orientation,
    
    // Network info
    isOnline,
    connectionType,
    
    // Optimization utilities
    optimizeForDevice,
    createLazyLoader,
    preloadResource,
    getOptimizedImageUrl,
    debounce,
    throttle,
    getGridColumns,
    getSpacing,
    
    // Device detection
    deviceType: deviceDetection.getDeviceType(),
    
    // Performance helpers
    shouldReduceMotion: connectionType === 'slow-2g' || connectionType === '2g',
    shouldUseLowQualityImages: connectionType === 'slow-2g' || connectionType === '2g' || !isOnline,
    shouldLazyLoad: isMobile || connectionType === 'slow-2g' || connectionType === '2g'
  }
}

export default useMobileOptimization
