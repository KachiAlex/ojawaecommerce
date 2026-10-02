import { useState, useRef, useEffect } from 'react';

const MobilePullToRefresh = ({ onRefresh, children, threshold = 80 }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const startYRef = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      startYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (window.scrollY > 0) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startYRef.current;
    
    if (deltaY > 0) {
      e.preventDefault();
      const distance = Math.min(deltaY * 0.5, threshold * 1.5);
      setPullDistance(distance);
      setIsPulling(distance > 20);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    setIsPulling(false);
  };

  const getRefreshIconRotation = () => {
    if (isRefreshing) return 'animate-spin';
    if (pullDistance > threshold) return 'rotate-180';
    return '';
  };

  const getRefreshOpacity = () => {
    return Math.min(pullDistance / threshold, 1);
  };

  return (
    <div 
      ref={containerRef}
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center bg-gray-50 transition-all duration-200"
        style={{
          height: `${Math.min(pullDistance, threshold)}px`,
          transform: `translateY(${-Math.max(0, pullDistance - threshold)}px)`,
          opacity: getRefreshOpacity()
        }}
      >
        <div className="flex flex-col items-center space-y-2">
          <div className={`w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full ${getRefreshIconRotation()}`} />
          <span className="text-sm text-gray-600">
            {isRefreshing ? 'Refreshing...' : pullDistance > threshold ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </div>
      
      {/* Content */}
      <div 
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${Math.max(0, pullDistance - threshold)}px)`
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default MobilePullToRefresh;
