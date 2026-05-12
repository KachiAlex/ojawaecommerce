import React from 'react';

const OjawaLogo = ({ className = "", size = "default", variant = "full" }) => {
  const sizeClasses = {
    small: "w-8 h-8",
    default: "w-12 h-12", 
    large: "w-16 h-16",
    xl: "w-20 h-20"
  };

  const textSizes = {
    small: "text-lg",
    default: "text-2xl",
    large: "text-3xl", 
    xl: "text-4xl"
  };

  if (variant === "icon") {
    return (
      <div className={`${sizeClasses[size]} ${className}`}>
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Simplified crown/tree symbol */}
          <g>
            {/* Central peak */}
            <path 
              d="M50 20 L45 30 L55 30 Z" 
              fill="#0d9488" 
              stroke="#fbbf24" 
              strokeWidth="2"
            />
            
            {/* Horizontal base */}
            <rect 
              x="35" y="30" width="30" height="6" 
              fill="#0d9488" 
              stroke="#fbbf24" 
              strokeWidth="2"
            />
            
            {/* Left extensions */}
            <path 
              d="M35 30 L30 40 L40 40 Z" 
              fill="#0d9488" 
              stroke="#fbbf24" 
              strokeWidth="2"
            />
            
            {/* Right extensions */}
            <path 
              d="M65 30 L70 40 L60 40 Z" 
              fill="#0d9488" 
              stroke="#fbbf24" 
              strokeWidth="2"
            />
            
            {/* Central diamond */}
            <rect 
              x="47" y="35" width="6" height="6" 
              fill="#fbbf24" 
              transform="rotate(45 50 38)"
            />
            
            {/* Additional gold accents */}
            <circle cx="42" cy="37" r="2" fill="#fbbf24" />
            <circle cx="58" cy="37" r="2" fill="#fbbf24" />
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Logo Icon */}
      <div className={sizeClasses[size]}>
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Simplified crown/tree symbol */}
          <g>
            {/* Central peak */}
            <path 
              d="M50 20 L45 30 L55 30 Z" 
              fill="#0d9488" 
              stroke="#fbbf24" 
              strokeWidth="2"
            />
            
            {/* Horizontal base */}
            <rect 
              x="35" y="30" width="30" height="6" 
              fill="#0d9488" 
              stroke="#fbbf24" 
              strokeWidth="2"
            />
            
            {/* Left extensions */}
            <path 
              d="M35 30 L30 40 L40 40 Z" 
              fill="#0d9488" 
              stroke="#fbbf24" 
              strokeWidth="2"
            />
            
            {/* Right extensions */}
            <path 
              d="M65 30 L70 40 L60 40 Z" 
              fill="#0d9488" 
              stroke="#fbbf24" 
              strokeWidth="2"
            />
            
            {/* Central diamond */}
            <rect 
              x="47" y="35" width="6" height="6" 
              fill="#fbbf24" 
              transform="rotate(45 50 38)"
            />
            
            {/* Additional gold accents */}
            <circle cx="42" cy="37" r="2" fill="#fbbf24" />
            <circle cx="58" cy="37" r="2" fill="#fbbf24" />
          </g>
        </svg>
      </div>
      
      {/* Logo Text */}
      <div className={`${textSizes[size]} font-bold`}>
        <span 
          className="text-teal-700"
          style={{
            textShadow: '1px 1px 2px #fbbf24',
            filter: 'drop-shadow(1px 1px 1px #fbbf24)'
          }}
        >
          OJAWA
        </span>
      </div>
    </div>
  );
};

export default OjawaLogo;
