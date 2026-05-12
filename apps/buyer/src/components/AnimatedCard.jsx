import React from 'react';
import { motion } from 'framer-motion';

const AnimatedCard = ({ 
  children, 
  className = "", 
  hover = true,
  clickable = false,
  onClick,
  delay = 0,
  ...props 
}) => {
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        delay,
        ease: "easeOut"
      }
    },
    hover: hover ? {
      y: -8,
      scale: 1.02,
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    } : {},
    tap: clickable ? {
      scale: 0.98,
      y: -4,
      transition: {
        duration: 0.1
      }
    } : {}
  };

  const glowVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        duration: 0.6,
        delay: delay + 0.2
      }
    }
  };

  return (
    <motion.div
      className={`relative bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 ${
        clickable ? 'cursor-pointer' : ''
      } ${className}`}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={hover ? "hover" : undefined}
      whileTap={clickable ? "tap" : undefined}
      onClick={onClick}
      {...props}
    >
      {/* Subtle glow effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-blue-500/5 opacity-0"
        variants={glowVariants}
        initial="hidden"
        animate="visible"
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Hover overlay */}
      {hover && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0"
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.div>
  );
};

export default AnimatedCard;
