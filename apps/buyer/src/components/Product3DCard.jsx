import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const Product3DCard = ({ product, onAddToCart }) => {
  const { addToCart, saveIntendedDestination } = useCart();
  const { currentUser } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isMouseDown, setIsMouseDown] = useState(false);
  const cardRef = useRef(null);

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    
    if (!currentUser) {
      saveIntendedDestination(`/products/${product.id}`, product.id);
      window.location.href = `/login`;
      return;
    }

    setIsAdding(true);
    try {
      await addToCart(product, 1);
      // Success feedback
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setTimeout(() => setIsAdding(false), 400);
    }
  };

  const handleMouseDown = (e) => {
    setIsMouseDown(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startRotX = rotation.x;
    const startRotY = rotation.y;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      setRotation({
        x: Math.max(-20, Math.min(20, startRotX + deltaY * 0.1)),
        y: Math.max(-20, Math.min(20, startRotY + deltaX * 0.1)),
      });
    };

    const handleMouseUp = () => {
      setIsMouseDown(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Reset rotation smoothly
      setRotation({ x: 0, y: 0 });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={cardRef}
      className="relative w-full perspective-1000"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      style={{
        transformStyle: 'preserve-3d',
      }}
    >
      <div
        className="relative w-full h-64 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing shadow-lg hover:shadow-2xl transition-shadow duration-300"
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transformStyle: 'preserve-3d',
          transition: isMouseDown ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {/* 3D Product Image Container */}
        <div 
          className="absolute inset-0"
          style={{
            transform: 'translateZ(20px)',
          }}
        >
          {product.imageUrls && product.imageUrls[0] ? (
            <img
              src={product.imageUrls[0]}
              alt={product.name}
              className="w-full h-full object-cover"
              style={{
                filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))',
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center">
              <span className="text-white text-4xl">🛍️</span>
            </div>
          )}
        </div>

        {/* 3D Badge */}
        <div
          className="absolute top-2 right-2 bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg"
          style={{
            transform: 'translateZ(30px)',
          }}
        >
          NEW
        </div>

        {/* 3D Content at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm p-4 transform-gpu"
          style={{
            transform: 'translateZ(40px)',
          }}
        >
          <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1">
            {product.name}
          </h3>
          <p className="text-emerald-600 font-bold text-xl mb-3">
            ₦{product.price?.toLocaleString()}
          </p>
          
          <button
            onClick={handleAddToCart}
            disabled={isAdding}
            className="w-full bg-emerald-600 text-white py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              transform: 'translateZ(50px)',
            }}
          >
            {isAdding ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Adding...
              </>
            ) : (
              <>
                <span>Add to Cart</span>
                <span>🛒</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Product3DCard;
