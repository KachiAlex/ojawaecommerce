import { useState, useEffect, useRef } from 'react';
import MobileTouchHandler from './MobileTouchHandler';

const MobileBottomSheet = ({ isOpen, onClose, children, title, snapPoints = [0.5, 0.9] }) => {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [currentSnapPoint, setCurrentSnapPoint] = useState(0);
  const sheetRef = useRef(null);
  const startYRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentSnapPoint(0);
      setDragY(0);
    }
  }, [isOpen]);

  const getSheetHeight = () => {
    const windowHeight = window.innerHeight;
    const snapHeight = snapPoints[currentSnapPoint] * windowHeight;
    return Math.max(0, snapHeight + dragY);
  };

  const handleSwipeUp = () => {
    if (currentSnapPoint < snapPoints.length - 1) {
      setCurrentSnapPoint(prev => prev + 1);
      setDragY(0);
    }
  };

  const handleSwipeDown = () => {
    if (currentSnapPoint > 0) {
      setCurrentSnapPoint(prev => prev - 1);
      setDragY(0);
    } else {
      onClose();
    }
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;
    setDragY(deltaY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const windowHeight = window.innerHeight;
    const threshold = windowHeight * 0.1; // 10% threshold
    
    if (Math.abs(dragY) > threshold) {
      if (dragY > 0) {
        // Swiping down
        if (currentSnapPoint > 0) {
          setCurrentSnapPoint(prev => prev - 1);
        } else {
          onClose();
        }
      } else {
        // Swiping up
        if (currentSnapPoint < snapPoints.length - 1) {
          setCurrentSnapPoint(prev => prev + 1);
        }
      }
    }
    
    setDragY(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-2xl transition-transform duration-300 ease-out"
        style={{
          height: `${getSheetHeight()}px`,
          transform: `translateY(${dragY}px)`
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        {title && (
          <div className="px-4 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MobileBottomSheet;
