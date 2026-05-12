import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AnimatedInput = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  success,
  disabled = false,
  required = false,
  icon = null,
  className = "",
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!value);
  const inputRef = useRef(null);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setHasValue(!!inputRef.current?.value);
  };

  const handleChange = (e) => {
    setHasValue(!!e.target.value);
    if (onChange) onChange(e);
  };

  const labelVariants = {
    inactive: {
      y: 0,
      scale: 1,
      color: "#6B7280"
    },
    active: {
      y: -20,
      scale: 0.85,
      color: isFocused ? "#10B981" : "#374151",
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  const inputVariants = {
    inactive: {
      borderColor: error ? "#EF4444" : success ? "#10B981" : "#D1D5DB",
      boxShadow: "0 0 0 0 rgba(16, 185, 129, 0)"
    },
    active: {
      borderColor: error ? "#EF4444" : success ? "#10B981" : "#10B981",
      boxShadow: error ? "0 0 0 3px rgba(239, 68, 68, 0.1)" : 
                success ? "0 0 0 3px rgba(16, 185, 129, 0.1)" :
                "0 0 0 3px rgba(16, 185, 129, 0.1)",
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  const iconVariants = {
    inactive: {
      scale: 1,
      color: "#6B7280"
    },
    active: {
      scale: 1.1,
      color: isFocused ? "#10B981" : "#374151",
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input container */}
      <motion.div
        className="relative"
        variants={inputVariants}
        animate={isFocused || hasValue ? "active" : "inactive"}
      >
        {/* Icon */}
        {icon && (
          <motion.div
            className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10"
            variants={iconVariants}
            animate={isFocused || hasValue ? "active" : "inactive"}
          >
            {icon}
          </motion.div>
        )}

        {/* Input field */}
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-white text-gray-900 placeholder-transparent
            focus:outline-none transition-all duration-200
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500' : success ? 'border-green-500' : 'border-gray-300'}
          `}
          placeholder={placeholder}
          {...props}
        />

        {/* Floating label */}
        <motion.label
          className={`
            absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none
            transition-all duration-200 origin-left
            ${isFocused || hasValue ? 'text-emerald-600' : 'text-gray-500'}
            ${error ? 'text-red-500' : success ? 'text-green-500' : ''}
          `}
          variants={labelVariants}
          animate={isFocused || hasValue ? "active" : "inactive"}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </motion.label>
      </motion.div>

      {/* Error/Success messages */}
      <AnimatePresence>
        {(error || success) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={`mt-2 text-sm flex items-center ${
              error ? 'text-red-600' : 'text-green-600'
            }`}
          >
            <motion.div
              className="mr-2"
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: error ? [0, -10, 10, 0] : [0, 0, 0, 0]
              }}
              transition={{ duration: 0.3 }}
            >
              {error ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </motion.div>
            {error || success}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedInput;
