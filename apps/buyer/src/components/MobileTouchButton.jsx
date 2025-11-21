import { useState, useRef, useEffect } from 'react'
import { deviceDetection, mobileAccessibility } from '../utils/mobileUtils'

const MobileTouchButton = ({
  children,
  onClick,
  onLongPress,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
  feedback = true,
  haptic = false,
  ...props
}) => {
  const [isPressed, setIsPressed] = useState(false)
  const [isLongPressing, setIsLongPressing] = useState(false)
  const pressTimer = useRef(null)
  const startPos = useRef({ x: 0, y: 0 })
  const buttonRef = useRef(null)

  // Haptic feedback function
  const triggerHaptic = () => {
    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(10) // Short vibration
    }
  }

  // Long press handler
  const handleLongPress = () => {
    if (onLongPress && !disabled) {
      setIsLongPressing(true)
      triggerHaptic()
      onLongPress()
    }
  }

  // Touch start handler
  const handleTouchStart = (e) => {
    if (disabled) return

    const touch = e.touches[0]
    startPos.current = { x: touch.clientX, y: touch.clientY }
    setIsPressed(true)

    // Start long press timer
    if (onLongPress) {
      pressTimer.current = setTimeout(handleLongPress, 500)
    }

    // Haptic feedback
    if (haptic) {
      triggerHaptic()
    }
  }

  // Touch end handler
  const handleTouchEnd = (e) => {
    if (disabled) return

    setIsPressed(false)
    setIsLongPressing(false)

    // Clear long press timer
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }

    // Check if it's a click (not long press)
    if (!isLongPressing && onClick) {
      const touch = e.changedTouches[0]
      const deltaX = Math.abs(touch.clientX - startPos.current.x)
      const deltaY = Math.abs(touch.clientY - startPos.current.y)

      // Only trigger click if movement is minimal (prevents accidental clicks)
      if (deltaX < 10 && deltaY < 10) {
        onClick(e)
      }
    }
  }

  // Touch move handler (cancel if moved too much)
  const handleTouchMove = (e) => {
    if (disabled) return

    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - startPos.current.x)
    const deltaY = Math.abs(touch.clientY - startPos.current.y)

    // Cancel if moved too much
    if (deltaX > 10 || deltaY > 10) {
      setIsPressed(false)
      if (pressTimer.current) {
        clearTimeout(pressTimer.current)
        pressTimer.current = null
      }
    }
  }

  // Mouse handlers for desktop
  const handleMouseDown = () => {
    if (disabled || deviceDetection.isTouchDevice()) return
    setIsPressed(true)
  }

  const handleMouseUp = (e) => {
    if (disabled || deviceDetection.isTouchDevice()) return
    setIsPressed(false)
    if (onClick) onClick(e)
  }

  const handleMouseLeave = () => {
    if (disabled || deviceDetection.isTouchDevice()) return
    setIsPressed(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current)
      }
    }
  }, [])

  // Ensure touch target size
  useEffect(() => {
    if (buttonRef.current) {
      mobileAccessibility.ensureTouchTarget(buttonRef.current)
    }
  }, [])

  // Base classes
  const baseClasses = `
    relative inline-flex items-center justify-center
    font-medium rounded-lg transition-all duration-150
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    select-none touch-manipulation
  `.trim()

  // Size classes
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs min-h-[32px]',
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-4 py-2 text-sm min-h-[44px]',
    lg: 'px-6 py-3 text-base min-h-[48px]',
    xl: 'px-8 py-4 text-lg min-h-[52px]'
  }

  // Variant classes
  const variantClasses = {
    primary: `
      bg-emerald-600 text-white
      hover:bg-emerald-700 focus:ring-emerald-500
      active:bg-emerald-800
    `,
    secondary: `
      bg-gray-100 text-gray-900
      hover:bg-gray-200 focus:ring-gray-500
      active:bg-gray-300
    `,
    outline: `
      border border-gray-300 text-gray-700 bg-white
      hover:bg-gray-50 focus:ring-gray-500
      active:bg-gray-100
    `,
    ghost: `
      text-gray-700 bg-transparent
      hover:bg-gray-100 focus:ring-gray-500
      active:bg-gray-200
    `,
    danger: `
      bg-red-600 text-white
      hover:bg-red-700 focus:ring-red-500
      active:bg-red-800
    `,
    success: `
      bg-green-600 text-white
      hover:bg-green-700 focus:ring-green-500
      active:bg-green-800
    `
  }

  // Press state classes
  const pressClasses = isPressed && feedback ? `
    scale-95 shadow-inner
  ` : ''

  // Long press classes
  const longPressClasses = isLongPressing ? `
    bg-opacity-80 scale-98
  ` : ''

  // Combine all classes
  const combinedClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${pressClasses}
    ${longPressClasses}
    ${className}
  `.trim()

  return (
    <button
      ref={buttonRef}
      className={combinedClasses}
      disabled={disabled}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </button>
  )
}

export default MobileTouchButton
