import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { deviceDetection, viewportUtils } from '../utils/mobileUtils'
import MobileNavigation from './MobileNavigation'
import MobileBottomNavigation from './MobileBottomNavigation'

const MobileAppLayout = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false)
  const [viewportHeight, setViewportHeight] = useState(0)
  const location = useLocation()

  // Check if current page should show bottom navigation
  const shouldShowBottomNav = () => {
    const hideBottomNavPages = ['/login', '/register', '/checkout']
    return !hideBottomNavPages.some(page => location.pathname.startsWith(page))
  }

  // Handle device detection and viewport changes
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(deviceDetection.isMobile())
      setViewportHeight(viewportUtils.getViewportHeight())
    }

    // Initial check
    handleResize()

    // Set up viewport meta tag for mobile
    if (deviceDetection.isMobile()) {
      viewportUtils.setViewportMeta({
        width: 'device-width',
        initialScale: 1,
        maximumScale: 1,
        userScalable: 'no',
        viewportFit: 'cover'
      })
    }

    // Listen for resize events
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)

    // Listen for visual viewport changes (mobile browser UI)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize)
      }
    }
  }, [])

  // Prevent zoom on input focus (iOS)
  useEffect(() => {
    if (!deviceDetection.isMobile()) return

    const preventZoom = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        const viewport = document.querySelector('meta[name="viewport"]')
        if (viewport) {
          viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
        }
      }
    }

    const restoreZoom = () => {
      const viewport = document.querySelector('meta[name="viewport"]')
      if (viewport) {
        viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
      }
    }

    document.addEventListener('focusin', preventZoom)
    document.addEventListener('focusout', restoreZoom)

    return () => {
      document.removeEventListener('focusin', preventZoom)
      document.removeEventListener('focusout', restoreZoom)
    }
  }, [])

  // Handle safe area for devices with notches
  useEffect(() => {
    if (deviceDetection.isMobile()) {
      // Add safe area CSS variables
      const style = document.createElement('style')
      style.textContent = `
        :root {
          --safe-area-inset-top: env(safe-area-inset-top);
          --safe-area-inset-bottom: env(safe-area-inset-bottom);
          --safe-area-inset-left: env(safe-area-inset-left);
          --safe-area-inset-right: env(safe-area-inset-right);
        }
        
        .safe-area-top {
          padding-top: var(--safe-area-inset-top);
        }
        
        .safe-area-bottom {
          padding-bottom: var(--safe-area-inset-bottom);
        }
        
        .safe-area-left {
          padding-left: var(--safe-area-inset-left);
        }
        
        .safe-area-right {
          padding-right: var(--safe-area-inset-right);
        }
        
        .min-h-screen-safe {
          min-height: calc(100vh - var(--safe-area-inset-top) - var(--safe-area-inset-bottom));
        }
        
        .h-screen-safe {
          height: calc(100vh - var(--safe-area-inset-top) - var(--safe-area-inset-bottom));
        }
      `
      document.head.appendChild(style)

      return () => {
        document.head.removeChild(style)
      }
    }
  }, [])

  // Calculate content height
  const getContentHeight = () => {
    if (!isMobile) return 'auto'
    
    const navHeight = 64 // Mobile navigation height
    const bottomNavHeight = shouldShowBottomNav() ? 64 : 0
    const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top') || '0')
    const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom') || '0')
    
    return `calc(100vh - ${navHeight + bottomNavHeight + safeAreaTop + safeAreaBottom}px)`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation */}
      {isMobile && <MobileNavigation />}

      {/* Main Content */}
      <main 
        className={`${isMobile ? 'pt-16' : ''} ${shouldShowBottomNav() && isMobile ? 'pb-16' : ''}`}
        style={{
          minHeight: isMobile ? getContentHeight() : 'auto'
        }}
      >
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && shouldShowBottomNav() && <MobileBottomNavigation />}

      {/* Mobile-specific styles */}
      {isMobile && (
        <style jsx global>{`
          /* Prevent overscroll bounce on iOS */
          body {
            overscroll-behavior: none;
            -webkit-overflow-scrolling: touch;
          }
          
          /* Smooth scrolling */
          html {
            scroll-behavior: smooth;
          }
          
          /* Improve touch targets */
          button, a, input, select, textarea {
            min-height: 44px;
            min-width: 44px;
          }
          
          /* Prevent text selection on buttons */
          button, .touch-target {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
            -webkit-tap-highlight-color: transparent;
          }
          
          /* Improve form inputs on mobile */
          input, textarea, select {
            font-size: 16px; /* Prevents zoom on iOS */
            -webkit-appearance: none;
            border-radius: 0;
          }
          
          /* Custom scrollbar for webkit browsers */
          ::-webkit-scrollbar {
            width: 8px;
          }
          
          ::-webkit-scrollbar-track {
            background: #f1f1f1;
          }
          
          ::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }
          
          /* Loading animation improvements */
          .loading-spinner {
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          /* Touch feedback */
          .touch-feedback:active {
            transform: scale(0.98);
            transition: transform 0.1s ease;
          }
          
          /* Safe area support */
          .safe-area-inset-top {
            padding-top: env(safe-area-inset-top);
          }
          
          .safe-area-inset-bottom {
            padding-bottom: env(safe-area-inset-bottom);
          }
          
          .safe-area-inset-left {
            padding-left: env(safe-area-inset-left);
          }
          
          .safe-area-inset-right {
            padding-right: env(safe-area-inset-right);
          }
        `}</style>
      )}
    </div>
  )
}

export default MobileAppLayout
