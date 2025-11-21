import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { deviceDetection, mobilePerformance } from '../utils/mobileUtils'
import MobileTouchButton from './MobileTouchButton'

const MobileModal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className = '',
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const modalRef = useRef(null)
  const previousBodyStyle = useRef(null)

  // Handle modal open/close animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setIsAnimating(true)
      
      // Prevent body scroll
      previousBodyStyle.current = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      
      // Trigger animation after mount
      const timer = setTimeout(() => setIsAnimating(false), 50)
      return () => clearTimeout(timer)
    } else {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setIsAnimating(false)
        document.body.style.overflow = previousBodyStyle.current || ''
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onClose])

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === modalRef.current) {
      onClose()
    }
  }

  // Handle touch events for mobile
  const handleTouchStart = (e) => {
    if (deviceDetection.isTouchDevice()) {
      e.preventDefault()
    }
  }

  // Get modal size classes
  const getSizeClasses = () => {
    const isMobile = deviceDetection.isMobile()
    const isTablet = deviceDetection.isTablet()

    if (isMobile) {
      return 'w-full h-full max-w-none max-h-none rounded-none'
    }

    if (isTablet) {
      switch (size) {
        case 'sm': return 'w-11/12 max-w-md'
        case 'lg': return 'w-11/12 max-w-4xl'
        case 'xl': return 'w-11/12 max-w-6xl'
        default: return 'w-11/12 max-w-2xl'
      }
    }

    // Desktop
    switch (size) {
      case 'sm': return 'w-full max-w-md'
      case 'lg': return 'w-full max-w-4xl'
      case 'xl': return 'w-full max-w-6xl'
      default: return 'w-full max-w-2xl'
    }
  }

  // Don't render if not visible
  if (!isVisible) return null

  const modalContent = (
    <div
      ref={modalRef}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isAnimating ? 'opacity-0' : 'opacity-100'
      } transition-opacity duration-300`}
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      {...props}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-black ${
        isAnimating ? 'bg-opacity-0' : 'bg-opacity-50'
      } transition-all duration-300`} />

      {/* Modal Content */}
      <div
        className={`relative bg-white rounded-lg shadow-xl max-h-full overflow-hidden ${
          getSizeClasses()
        } ${isAnimating ? 'scale-95 translate-y-4' : 'scale-100 translate-y-0'} transition-all duration-300 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            {title && (
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            )}
            {showCloseButton && (
              <MobileTouchButton
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-2 -mr-2"
              >
                <span className="text-xl">✕</span>
              </MobileTouchButton>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(100vh-8rem)]">
          {children}
        </div>
      </div>
    </div>
  )

  // Render modal in portal
  return createPortal(modalContent, document.body)
}

// Mobile Action Sheet Component
export const MobileActionSheet = ({
  isOpen,
  onClose,
  title,
  actions = [],
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setIsAnimating(true)
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
      
      const timer = setTimeout(() => setIsAnimating(false), 50)
      return () => clearTimeout(timer)
    } else {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setIsAnimating(false)
        document.body.style.overflow = ''
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          isAnimating ? 'bg-opacity-0' : 'bg-opacity-50'
        }`}
        onClick={onClose}
      />

      {/* Action Sheet */}
      <div
        className={`relative w-full bg-white rounded-t-xl shadow-xl ${
          isAnimating ? 'translate-y-full' : 'translate-y-0'
        } transition-transform duration-300 ${className}`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 text-center">{title}</h3>
          </div>
        )}

        {/* Actions */}
        <div className="py-2">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick?.()
                onClose()
              }}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                action.destructive ? 'text-red-600' : 'text-gray-900'
              } ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={action.disabled}
            >
              <div className="flex items-center">
                {action.icon && <span className="mr-3 text-xl">{action.icon}</span>}
                <div>
                  <div className="font-medium">{action.title}</div>
                  {action.subtitle && (
                    <div className="text-sm text-gray-500">{action.subtitle}</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Cancel Button */}
        <div className="px-4 pb-4 pt-2">
          <MobileTouchButton
            variant="outline"
            className="w-full"
            onClick={onClose}
          >
            Cancel
          </MobileTouchButton>
        </div>

        {/* Safe area bottom padding */}
        <div className="h-safe-bottom" />
      </div>
    </div>
  )
}

// Mobile Drawer Component
export const MobileDrawer = ({
  isOpen,
  onClose,
  children,
  side = 'left',
  size = 'sm',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setIsAnimating(true)
      document.body.style.overflow = 'hidden'
      
      const timer = setTimeout(() => setIsAnimating(false), 50)
      return () => clearTimeout(timer)
    } else {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setIsAnimating(false)
        document.body.style.overflow = ''
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isVisible) return null

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-80'
      case 'md': return 'w-96'
      case 'lg': return 'w-1/2'
      case 'xl': return 'w-2/3'
      default: return 'w-80'
    }
  }

  const getPositionClasses = () => {
    return side === 'left' ? 'left-0' : 'right-0'
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          isAnimating ? 'bg-opacity-0' : 'bg-opacity-50'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`relative bg-white shadow-xl ${getSizeClasses()} ${getPositionClasses()} ${
          isAnimating 
            ? side === 'left' ? '-translate-x-full' : 'translate-x-full'
            : 'translate-x-0'
        } transition-transform duration-300 h-full ${className}`}
      >
        {children}
      </div>
    </div>
  )
}

export default MobileModal
