import React from 'react';

const SimpleLogo = ({ className = "", size = "default", variant = "full" }) => {
  const sizeClasses = {
    small: "w-8 h-8",
    default: "w-12 h-12", 
    large: "w-16 h-16",
    xl: "w-20 h-20"
  };

  const textSizes = {
    small: "text-base",
    default: "text-xl",
    large: "text-2xl", 
    xl: "text-3xl"
  };

  // New geometric logo SVG
  const LogoIcon = ({ className: iconClassName }) => (
    <svg 
      viewBox="0 0 120 120" 
      className={iconClassName || "w-full h-full"}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Geometric logo with interlocking polygons */}
      <g>
        {/* Dark Green sections - bottom left */}
        <path 
          d="M30 90 L20 105 L45 105 L35 90 Z" 
          fill="#008000" 
          stroke="none"
        />
        <path 
          d="M35 90 L20 105 L20 75 L35 75 Z" 
          fill="#228B22" 
          stroke="none"
        />
        
        {/* Red sections - bottom left and bottom right */}
        <path 
          d="M25 60 L15 75 L30 75 L35 60 Z" 
          fill="#DC2626" 
          stroke="none"
        />
        <path 
          d="M95 60 L105 75 L90 75 L85 60 Z" 
          fill="#DC2626" 
          stroke="none"
        />
        <path 
          d="M85 60 L90 75 L75 75 L70 60 Z" 
          fill="#EF4444" 
          stroke="none"
        />
        
        {/* Orange sections - bottom right and top right */}
        <path 
          d="M75 45 L85 60 L70 60 L65 45 Z" 
          fill="#F97316" 
          stroke="none"
        />
        <path 
          d="M95 30 L105 45 L90 45 L85 30 Z" 
          fill="#F97316" 
          stroke="none"
        />
        <path 
          d="M85 45 L105 45 L100 30 L85 30 Z" 
          fill="#FB923C" 
          stroke="none"
        />
        
        {/* Yellow section - top right */}
        <path 
          d="M85 15 L100 30 L85 30 L75 15 Z" 
          fill="#FBBF24" 
          stroke="none"
        />
        <path 
          d="M75 15 L85 30 L70 30 L60 15 Z" 
          fill="#FCD34D" 
          stroke="none"
        />
        
        {/* Light Green sections - top left and bottom right */}
        <path 
          d="M35 45 L25 60 L40 60 L50 45 Z" 
          fill="#86EFAC" 
          stroke="none"
        />
        <path 
          d="M60 45 L50 60 L65 60 L70 45 Z" 
          fill="#86EFAC" 
          stroke="none"
        />
        <path 
          d="M25 30 L35 45 L20 45 L15 30 Z" 
          fill="#86EFAC" 
          stroke="none"
        />
        
        {/* White irregular hexagonal center */}
        <path 
          d="M45 55 L50 45 L60 45 L65 55 L60 65 L50 65 Z" 
          fill="white" 
          stroke="none"
        />
        <path 
          d="M50 55 L55 50 L55 60 L50 60 Z" 
          fill="#F0F0F0" 
          stroke="none"
        />
        
        {/* Additional overlapping shapes for depth */}
        <path 
          d="M40 50 L50 45 L50 55 L45 60 Z" 
          fill="#6EE7B7" 
          fillOpacity="0.7" 
          stroke="none"
        />
        <path 
          d="M70 50 L65 45 L75 45 L75 55 Z" 
          fill="#FCD34D" 
          fillOpacity="0.6" 
          stroke="none"
        />
      </g>
    </svg>
  );

  if (variant === "icon") {
    return (
      <div className={`${sizeClasses[size]} ${className}`}>
        <LogoIcon />
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={sizeClasses[size]}>
        <LogoIcon />
      </div>
      <div className={`${textSizes[size]} font-bold`} style={{ color: '#1e3a8a' }}>
        Ojawa
      </div>
    </div>
  );
};

export default SimpleLogo;
