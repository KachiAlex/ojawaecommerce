// Animation Utilities and Constants
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 700
};

export const EASING = {
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
};

// CSS Animation Classes
export const ANIMATION_CLASSES = {
  // Fade animations
  fadeIn: 'animate-fade-in',
  fadeOut: 'animate-fade-out',
  fadeInUp: 'animate-fade-in-up',
  fadeInDown: 'animate-fade-in-down',
  fadeInLeft: 'animate-fade-in-left',
  fadeInRight: 'animate-fade-in-right',
  
  // Scale animations
  scaleIn: 'animate-scale-in',
  scaleOut: 'animate-scale-out',
  scaleUp: 'animate-scale-up',
  scaleDown: 'animate-scale-down',
  
  // Slide animations
  slideInUp: 'animate-slide-in-up',
  slideInDown: 'animate-slide-in-down',
  slideInLeft: 'animate-slide-in-left',
  slideInRight: 'animate-slide-in-right',
  
  // Rotate animations
  rotateIn: 'animate-rotate-in',
  rotateOut: 'animate-rotate-out',
  
  // Bounce animations
  bounceIn: 'animate-bounce-in',
  bounceOut: 'animate-bounce-out',
  
  // Pulse animations
  pulse: 'animate-pulse',
  pulseSlow: 'animate-pulse-slow',
  
  // Shake animations
  shake: 'animate-shake',
  shakeHorizontal: 'animate-shake-horizontal',
  
  // Glow animations
  glow: 'animate-glow',
  glowPulse: 'animate-glow-pulse',
  
  // Loading animations
  spin: 'animate-spin',
  ping: 'animate-ping',
  bounce: 'animate-bounce',
  
  // Hover effects
  hoverLift: 'hover:animate-lift',
  hoverGlow: 'hover:animate-glow',
  hoverScale: 'hover:animate-scale-up',
  hoverRotate: 'hover:animate-rotate-3',
  
  // Stagger animations
  stagger1: 'animate-stagger-1',
  stagger2: 'animate-stagger-2',
  stagger3: 'animate-stagger-3',
  stagger4: 'animate-stagger-4',
  stagger5: 'animate-stagger-5',
  stagger6: 'animate-stagger-6',
  stagger7: 'animate-stagger-7',
  stagger8: 'animate-stagger-8'
};

// Animation presets for common use cases
export const ANIMATION_PRESETS = {
  // Page transitions
  pageEnter: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: EASING.easeOut }
  },
  
  // Modal animations
  modalEnter: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2, ease: EASING.easeOut }
  },
  
  // Card hover
  cardHover: {
    whileHover: { 
      y: -4, 
      scale: 1.02,
      transition: { duration: 0.2, ease: EASING.easeOut }
    },
    whileTap: { 
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  },
  
  // Button interactions
  buttonPress: {
    whileHover: { 
      scale: 1.05,
      transition: { duration: 0.2, ease: EASING.easeOut }
    },
    whileTap: { 
      scale: 0.95,
      transition: { duration: 0.1 }
    }
  },
  
  // List items
  listItem: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.3, ease: EASING.easeOut }
  },
  
  // Loading states
  loadingPulse: {
    animate: { 
      opacity: [0.5, 1, 0.5],
      scale: [0.95, 1.05, 0.95]
    },
    transition: { 
      duration: 1.5, 
      repeat: Infinity, 
      ease: EASING.easeInOut 
    }
  },
  
  // Success animations
  successBounce: {
    initial: { scale: 0 },
    animate: { 
      scale: [0, 1.2, 1],
      rotate: [0, 5, -5, 0]
    },
    transition: { 
      duration: 0.6, 
      ease: EASING.bounce 
    }
  },
  
  // Error animations
  errorShake: {
    animate: { 
      x: [0, -10, 10, -10, 10, 0],
      rotate: [0, -2, 2, -2, 2, 0]
    },
    transition: { 
      duration: 0.5, 
      ease: EASING.easeOut 
    }
  }
};

// Utility functions
export const createStaggerAnimation = (delay = 0.1) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay, ease: EASING.easeOut }
});

export const createFadeInAnimation = (direction = 'up', delay = 0) => {
  const directions = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: -20 },
    right: { x: 20 }
  };
  
  return {
    initial: { opacity: 0, ...directions[direction] },
    animate: { opacity: 1, x: 0, y: 0 },
    transition: { duration: 0.4, delay, ease: EASING.easeOut }
  };
};

export const createScaleAnimation = (scale = 1.05, duration = 0.2) => ({
  whileHover: { 
    scale,
    transition: { duration, ease: EASING.easeOut }
  },
  whileTap: { 
    scale: 0.95,
    transition: { duration: 0.1 }
  }
});

// Intersection Observer for scroll animations
export const useScrollAnimation = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold]);

  return [ref, isVisible];
};

// Animation delay calculator for staggered effects
export const getStaggerDelay = (index, baseDelay = 0.1) => index * baseDelay;

// Spring animation configurations
export const SPRING_CONFIG = {
  gentle: { tension: 300, friction: 30 },
  wobbly: { tension: 300, friction: 20 },
  stiff: { tension: 300, friction: 40 },
  slow: { tension: 200, friction: 30 },
  fast: { tension: 400, friction: 30 }
};
