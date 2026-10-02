import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../contexts/CartContext';
import { getPrimaryImage } from '../utils/imageUtils';
import ProductCard from './ProductCard';

const ProductCarousel = ({ 
  title, 
  products = [], 
  showDiscount = true, 
  showItemsLeft = false,
  autoScroll = false,
  scrollInterval = 5000,
  className = ''
}) => {
  const { addToCart } = useCart();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const scrollContainerRef = useRef(null);
  const itemsPerView = typeof window !== 'undefined' && window.innerWidth >= 1280 ? 6 : 
                       typeof window !== 'undefined' && window.innerWidth >= 1024 ? 5 :
                       typeof window !== 'undefined' && window.innerWidth >= 768 ? 4 : 2;

  // Auto-scroll functionality - rotates products every set interval (default: 3 minutes)
  // Pauses when user hovers over the carousel
  useEffect(() => {
    if (!autoScroll || products.length <= itemsPerView || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const maxIndex = Math.max(0, products.length - itemsPerView);
        // Scroll by one full page of items at a time
        const nextIndex = prev + itemsPerView;
        // If we've reached the end or would go beyond, loop back to start
        return nextIndex > maxIndex ? 0 : nextIndex;
      });
    }, scrollInterval);

    return () => clearInterval(interval);
  }, [autoScroll, products.length, itemsPerView, scrollInterval, isPaused]);

  // Scroll to current index
  useEffect(() => {
    if (scrollContainerRef.current && products.length > 0) {
      // Calculate scroll position based on current index and item width
      const container = scrollContainerRef.current;
      const firstChild = container.firstElementChild;
      if (firstChild) {
        const itemWidth = firstChild.offsetWidth;
        const gap = 16; // 1rem gap = 16px
        const scrollPosition = currentIndex * (itemWidth + gap);
        
        container.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  }, [currentIndex, products.length]);

  const handlePrev = () => {
    if (isScrolling) return;
    setIsScrolling(true);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    setTimeout(() => setIsScrolling(false), 300);
  };

  const handleNext = () => {
    if (isScrolling) return;
    setIsScrolling(true);
    const maxIdx = Math.max(0, products.length - itemsPerView);
    setCurrentIndex((prev) => (prev >= maxIdx ? 0 : prev + 1));
    setTimeout(() => setIsScrolling(false), 300);
  };

  const maxIndex = Math.max(0, products.length - itemsPerView);
  const canScrollPrev = currentIndex > 0;
  const canScrollNext = currentIndex < maxIndex;

  if (!products || products.length === 0) {
    return (
      <div className={className}>
        {title && (
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
          </div>
        )}
        <div className="text-center py-12 text-gray-500">
          <p>No products available at the moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className={`text-xl md:text-2xl font-bold ${className.includes('text-white') ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
          <Link 
            to="/products" 
            className={`${className.includes('text-white') ? 'text-emerald-300 hover:text-emerald-200' : 'text-emerald-600 hover:text-emerald-700'} font-medium text-sm md:text-base flex items-center gap-1`}
          >
            See All
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}

      {/* Carousel Container */}
      <div 
        className="relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Navigation Buttons */}
        {products.length > itemsPerView && (
          <>
            <button
              onClick={handlePrev}
              disabled={!canScrollPrev || isScrolling}
              className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full p-2 shadow-lg transition-all ${
                className.includes('text-white') 
                  ? 'bg-slate-800 border border-emerald-700/50 hover:bg-slate-700 text-emerald-300' 
                  : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700'
              } ${
                canScrollPrev ? 'opacity-100' : 'opacity-30 cursor-not-allowed'
              } ${isScrolling ? 'cursor-wait' : ''}`}
              aria-label="Previous products"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNext}
              disabled={!canScrollNext || isScrolling}
              className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full p-2 shadow-lg transition-all ${
                className.includes('text-white') 
                  ? 'bg-slate-800 border border-emerald-700/50 hover:bg-slate-700 text-emerald-300' 
                  : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700'
              } ${
                canScrollNext ? 'opacity-100' : 'opacity-30 cursor-not-allowed'
              } ${isScrolling ? 'cursor-wait' : ''}`}
              aria-label="Next products"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Products Grid */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <style>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {products.map((product, index) => {
            return (
              <motion.div
                key={product.id || index}
                className="flex-shrink-0 w-[calc(50%-0.5rem)] sm:w-[calc(33.333%-0.67rem)] md:w-[calc(25%-0.75rem)] lg:w-[calc(20%-0.8rem)] xl:w-[calc(16.666%-0.83rem)]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {/* Use ProductCard component for consistent image rendering */}
                <ProductCard product={product} />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProductCarousel;

