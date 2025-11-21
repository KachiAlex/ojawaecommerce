import { useState, useRef } from 'react';
import MobileTouchHandler from './MobileTouchHandler';

const MobileSwipeableCard = ({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  leftAction, 
  rightAction,
  leftActionColor = 'bg-red-500',
  rightActionColor = 'bg-green-500',
  leftActionIcon = '🗑️',
  rightActionIcon = '✅'
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const cardRef = useRef(null);

  const handleTouchStart = (e) => {
    setIsDragging(true);
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - startXRef.current;
    setTranslateX(deltaX);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const threshold = 100;
    
    if (Math.abs(translateX) > threshold) {
      if (translateX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (translateX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    setTranslateX(0);
  };

  const handleSwipeLeft = () => {
    if (onSwipeLeft) {
      onSwipeLeft();
    }
  };

  const handleSwipeRight = () => {
    if (onSwipeRight) {
      onSwipeRight();
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Action indicators */}
      <div className="absolute inset-0 flex">
        <div className={`flex-1 ${rightActionColor} flex items-center justify-start pl-4`}>
          <span className="text-white text-2xl">{rightActionIcon}</span>
          <span className="text-white ml-2 font-medium">{rightAction}</span>
        </div>
        <div className={`flex-1 ${leftActionColor} flex items-center justify-end pr-4`}>
          <span className="text-white font-medium">{leftAction}</span>
          <span className="text-white text-2xl ml-2">{leftActionIcon}</span>
        </div>
      </div>
      
      {/* Card content */}
      <MobileTouchHandler
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={cardRef}
          className="relative bg-white transition-transform duration-200 ease-out"
          style={{
            transform: `translateX(${translateX}px)`,
            zIndex: 10
          }}
        >
          {children}
        </div>
      </MobileTouchHandler>
    </div>
  );
};

export default MobileSwipeableCard;
