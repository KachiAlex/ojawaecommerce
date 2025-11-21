import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const AnimatedPage = ({ children, className = "" }) => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, [location.pathname]);

  const pageVariants = {
    initial: { 
      opacity: 0, 
      y: 30,
      scale: 0.96,
      filter: 'blur(10px)'
    },
    in: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      filter: 'blur(0px)'
    },
    out: { 
      opacity: 0, 
      y: -30,
      scale: 1.04,
      filter: 'blur(10px)'
    }
  };

  const pageTransition = {
    type: "tween",
    ease: [0.4, 0, 0.2, 1], // Custom cubic-bezier for smoother animations
    duration: 0.5
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className={`min-h-screen ${className}`}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedPage;
