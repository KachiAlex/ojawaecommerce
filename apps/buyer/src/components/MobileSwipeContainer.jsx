import { useState, useRef, useEffect, useCallback } from 'react'
import { touchGestures, deviceDetection } from '../utils/mobileUtils'

const MobileSwipeContainer = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  swipeThreshold = 50,
  enableVerticalSwipe = true,
  enableHorizontalSwipe = true,
  className = '',
  ...props
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 })
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)
  
  const containerRef = useRef(null)
  const startTime = useRef(0)

  // Touch start handler
  const handleTouchStart = useCallback((e) => {
    if (!deviceDetection.isTouchDevice()) return

    const touch = touchGestures.getTouchCoordinates(e)
    setStartPos(touch)
    setCurrentPos(touch)
    setIsDragging(true)
    startTime.current = Date.now()

    // Prevent default to avoid scrolling
    if (enableHorizontalSwipe || enableVerticalSwipe) {
      e.preventDefault()
    }
  }, [enableHorizontalSwipe, enableVerticalSwipe])

  // Touch move handler
  const handleTouchMove = useCallback((e) => {
    if (!isDragging || !deviceDetection.isTouchDevice()) return

    const touch = touchGestures.getTouchCoordinates(e)
    setCurrentPos(touch)

    // Calculate translation
    const deltaX = touch.x - startPos.x
    const deltaY = touch.y - startPos.y

    // Apply constraints based on enabled directions
    if (enableHorizontalSwipe && !enableVerticalSwipe) {
      setTranslateX(deltaX)
      setTranslateY(0)
    } else if (enableVerticalSwipe && !enableHorizontalSwipe) {
      setTranslateX(0)
      setTranslateY(deltaY)
    } else {
      setTranslateX(deltaX)
      setTranslateY(deltaY)
    }
  }, [isDragging, startPos, enableHorizontalSwipe, enableVerticalSwipe])

  // Touch end handler
  const handleTouchEnd = useCallback((e) => {
    if (!isDragging || !deviceDetection.isTouchDevice()) return

    const touch = touchGestures.getTouchCoordinates(e)
    const endTime = Date.now()
    const duration = endTime - startTime.current

    // Calculate swipe direction and distance
    const swipeDirection = touchGestures.detectSwipe(
      startPos.x,
      startPos.y,
      touch.x,
      touch.y,
      swipeThreshold
    )

    // Reset translation
    setTranslateX(0)
    setTranslateY(0)
    setIsDragging(false)

    // Trigger swipe callbacks
    if (swipeDirection && duration < 500) { // Only trigger if swipe was fast enough
      switch (swipeDirection) {
        case 'left':
          if (enableHorizontalSwipe && onSwipeLeft) {
            onSwipeLeft(e)
          }
          break
        case 'right':
          if (enableHorizontalSwipe && onSwipeRight) {
            onSwipeRight(e)
          }
          break
        case 'up':
          if (enableVerticalSwipe && onSwipeUp) {
            onSwipeUp(e)
          }
          break
        case 'down':
          if (enableVerticalSwipe && onSwipeDown) {
            onSwipeDown(e)
          }
          break
      }
    }
  }, [
    isDragging,
    startPos,
    swipeThreshold,
    enableHorizontalSwipe,
    enableVerticalSwipe,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown
  ])

  // Mouse handlers for desktop testing
  const handleMouseDown = useCallback((e) => {
    if (deviceDetection.isTouchDevice()) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      setStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      setCurrentPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      setIsDragging(true)
      startTime.current = Date.now()
    }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || deviceDetection.isTouchDevice()) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      const touch = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      setCurrentPos(touch)

      const deltaX = touch.x - startPos.x
      const deltaY = touch.y - startPos.y

      if (enableHorizontalSwipe && !enableVerticalSwipe) {
        setTranslateX(deltaX)
        setTranslateY(0)
      } else if (enableVerticalSwipe && !enableHorizontalSwipe) {
        setTranslateX(0)
        setTranslateY(deltaY)
      } else {
        setTranslateX(deltaX)
        setTranslateY(deltaY)
      }
    }
  }, [isDragging, startPos, enableHorizontalSwipe, enableVerticalSwipe])

  const handleMouseUp = useCallback((e) => {
    if (!isDragging || deviceDetection.isTouchDevice()) return

    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      const touch = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const endTime = Date.now()
      const duration = endTime - startTime.current

      const swipeDirection = touchGestures.detectSwipe(
        startPos.x,
        startPos.y,
        touch.x,
        touch.y,
        swipeThreshold
      )

      setTranslateX(0)
      setTranslateY(0)
      setIsDragging(false)

      if (swipeDirection && duration < 500) {
        switch (swipeDirection) {
          case 'left':
            if (enableHorizontalSwipe && onSwipeLeft) onSwipeLeft(e)
            break
          case 'right':
            if (enableHorizontalSwipe && onSwipeRight) onSwipeRight(e)
            break
          case 'up':
            if (enableVerticalSwipe && onSwipeUp) onSwipeUp(e)
            break
          case 'down':
            if (enableVerticalSwipe && onSwipeDown) onSwipeDown(e)
            break
        }
      }
    }
  }, [
    isDragging,
    startPos,
    swipeThreshold,
    enableHorizontalSwipe,
    enableVerticalSwipe,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown
  ])

  // Add event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Touch events
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: false })

    // Mouse events for desktop testing
    container.addEventListener('mousedown', handleMouseDown)
    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseup', handleMouseUp)
    container.addEventListener('mouseleave', () => {
      setIsDragging(false)
      setTranslateX(0)
      setTranslateY(0)
    })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('mousedown', handleMouseDown)
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp])

  // Calculate transform style
  const transformStyle = {
    transform: `translate(${translateX}px, ${translateY}px)`,
    transition: isDragging ? 'none' : 'transform 0.3s ease-out'
  }

  return (
    <div
      ref={containerRef}
      className={`touch-manipulation select-none ${className}`}
      style={transformStyle}
      {...props}
    >
      {children}
    </div>
  )
}

export default MobileSwipeContainer
