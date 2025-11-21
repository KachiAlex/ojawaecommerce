import React from 'react';

const SimpleLogo = ({ className = "", size = "default", variant = "full" }) => {
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

  // Try to load logo from public folder, fallback to SVG
  const logoSrc = "/logos/ojawa-logo.png"; // You can paste your logo here as ojawa-logo.png
  const logoSrcSvg = "/logos/ojawa-logo.svg"; // Or as SVG
  const logoSrcJpg = "/logos/ojawa-logo.jpg"; // Or as JPG

  if (variant === "icon") {
    return (
      <div className={`${sizeClasses[size]} ${className}`}>
        <img 
          src={logoSrc}
          alt="OJAWA Logo"
          className="w-full h-full object-contain"
          onError={(e) => {
            // Try SVG fallback
            e.target.src = logoSrcSvg;
            e.target.onError = () => {
              // Try JPG fallback
              e.target.src = logoSrcJpg;
              e.target.onError = () => {
                // Final fallback to text
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              };
            };
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
    <div className={`${sizeClasses[size]} ${className}`}>
      <img 
        src={logoSrc}
        alt="OJAWA Logo"
        className="w-full h-full object-contain"
        onError={(e) => {
          // Try SVG fallback
          e.target.src = logoSrcSvg;
          e.target.onError = () => {
            // Try JPG fallback
            e.target.src = logoSrcJpg;
            e.target.onError = () => {
              // Final fallback to text
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            };
          };
        }}
      />
      {/* Fallback text logo */}
      <div className="w-full h-full flex items-center justify-center bg-emerald-600 text-white font-bold text-lg hidden">
        O
      </div>
    </div>
  );
};

export default SimpleLogo;
