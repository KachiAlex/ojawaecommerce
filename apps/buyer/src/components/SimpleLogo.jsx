import React from 'react';

const SimpleLogo = ({ className = "", size = "default", variant = "full" }) => {
  const sizeClasses = {
    small: "w-8 h-8",
    default: "w-12 h-12", 
    large: "h-[120px] w-auto", // Tripled from h-10 (40px) to 120px, width auto for SVG aspect ratio
    xl: "w-20 h-20"
  };

  const textSizes = {
    small: "text-base",
    default: "text-xl",
    large: "text-2xl", 
    xl: "text-3xl"
  };

  // Logo SVG file path
  const logoSrc = "/logos/ojawa-logo.svg";
  const logoSrcPng = "/logos/ojawa-logo.png"; // Fallback

  if (variant === "icon") {
    return (
      <div className={`${sizeClasses[size]} ${className} bg-transparent p-0.5 flex items-center justify-center`}>
        <img 
          src={logoSrc}
          alt="Ojawa Logo"
          className="w-full h-full object-contain"
          onError={(e) => {
            // Fallback to PNG if SVG fails
            if (e.target.src !== logoSrcPng) {
              e.target.src = logoSrcPng;
            } else {
              // Final fallback to text
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }
          }}
        />
        {/* Fallback text logo */}
        <div className="w-full h-full flex items-center justify-center bg-emerald-600 text-white font-bold text-lg hidden">
          O
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={sizeClasses[size]}>
        <img 
          src={logoSrc}
          alt="Ojawa Logo"
          className="w-full h-full object-contain"
          onError={(e) => {
            // Fallback to PNG if SVG fails
            if (e.target.src !== logoSrcPng) {
              e.target.src = logoSrcPng;
            } else {
              // Final fallback to text
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }
          }}
        />
        {/* Fallback text logo */}
        <div className="w-full h-full flex items-center justify-center bg-emerald-600 text-white font-bold text-lg hidden">
          O
        </div>
      </div>
      {/* Wordmark without capsule */}
      <div className={`${textSizes[size]} font-semibold`}>
        <span className="inline-flex items-center text-[#0b1f3d] tracking-tight leading-tight">
          Ojawa
        </span>
      </div>
    </div>
  );
};

export default SimpleLogo;
