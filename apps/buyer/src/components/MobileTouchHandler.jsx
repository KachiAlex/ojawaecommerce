import { useEffect, useRef } from 'react';

const MobileTouchHandler = ({ children, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap, onLongPress }) => {
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      };

      // Long press detection
      if (onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          onLongPress(e);
        }, 500); // 500ms for long press
      }
    };

    const handleTouchMove = (e) => {
      // Clear long press timer if user moves
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const handleTouchEnd = (e) => {
      // Clear long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (!touchStartRef.current) return;

      touchEndRef.current = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
        time: Date.now()
      };

      const deltaX = touchEndRef.current.x - touchStartRef.current.x;
      const deltaY = touchEndRef.current.y - touchStartRef.current.y;
      const deltaTime = touchEndRef.current.time - touchStartRef.current.time;

      // Determine if it's a swipe or tap
      const minSwipeDistance = 50;
      const maxSwipeTime = 300;

      if (deltaTime < maxSwipeTime) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal swipe
          if (Math.abs(deltaX) > minSwipeDistance) {
            if (deltaX > 0 && onSwipeRight) {
              onSwipeRight(e);
            } else if (deltaX < 0 && onSwipeLeft) {
              onSwipeLeft(e);
            }
          } else if (Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20 && onTap) {
            // Tap (small movement)
            onTap(e);
          }
        } else {
          // Vertical swipe
          if (Math.abs(deltaY) > minSwipeDistance) {
            if (deltaY > 0 && onSwipeDown) {
              onSwipeDown(e);
            } else if (deltaY < 0 && onSwipeUp) {
              onSwipeUp(e);
            }
          } else if (Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20 && onTap) {
            // Tap (small movement)
            onTap(e);
          }
        }
      }

      // Reset touch references
      touchStartRef.current = null;
      touchEndRef.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap, onLongPress]);

  return (
    <div ref={elementRef} className="touch-handler">
      {children}
    </div>
  );
};

export default MobileTouchHandler;
