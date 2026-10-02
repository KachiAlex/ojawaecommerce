import React from 'react';

const SimpleLogo = ({ className = "", size = "default", variant = "full", tone = "dark" }) => {
  const sizeClasses = {
    small: "h-7 w-28",
    default: "h-9 w-36",
    large: "h-10 w-40",
    xl: "h-14 w-56"
  };

  const textSizes = {
    small: "text-base",
    default: "text-xl",
    large: "text-2xl", 
    xl: "text-3xl"
  };

  // Logo asset paths (lockup SVG as primary, PNG fallback)
  const logoSrc = tone === "light" ? "/logos/ojawa-brand-lockup-light.svg" : "/logos/ojawa-brand-lockup.svg";
  const logoSrcFallback = "/logos/ojawa-logo.png"; // Fallback

  if (variant === "icon") {
    return (
      <div className={`${sizeClasses[size]} ${className} bg-transparent p-0.5 flex items-center justify-center`}>
        <img 
          src={logoSrc}
          alt="Ojawa Logo"
          className="w-full h-full object-contain object-left"
          onError={(e) => {
            // Fallback to PNG if lockup SVG fails
            if (e.target.src !== logoSrcFallback) {
              e.target.src = logoSrcFallback;
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
          className="w-full h-full object-contain object-left"
          onError={(e) => {
            // Fallback to PNG if lockup SVG fails
            if (e.target.src !== logoSrcFallback) {
              e.target.src = logoSrcFallback;
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
    </div>
  );
};

export default SimpleLogo;
