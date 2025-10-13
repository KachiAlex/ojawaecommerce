import React, { useState, useRef, useEffect } from 'react';

const OptimizedImage = ({ 
  src, 
  alt, 
  className = '', 
  placeholder = '/placeholder-image.jpg',
  loading = 'lazy',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  ...props 
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageRef, setImageRef] = useState();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    let observer;
    const currentImageRef = imageRef;

    if (currentImageRef) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsInView(true);
              observer.unobserve(currentImageRef);
            }
          });
        },
        { threshold: 0.1, rootMargin: '50px' }
      );
      observer.observe(currentImageRef);
    }

    return () => {
      if (currentImageRef && observer) {
        observer.unobserve(currentImageRef);
      }
    };
  }, [imageRef]);

  useEffect(() => {
    if (isInView) {
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      img.onerror = () => {
        // Fallback to placeholder if image fails to load
        setImageSrc(placeholder);
        setIsLoaded(true);
      };
      img.src = src;
    }
  }, [isInView, src, placeholder]);

  return (
    <div className={`relative overflow-hidden ${className}`} {...props}>
      <img
        ref={setImageRef}
        src={imageSrc}
        alt={alt}
        loading={loading}
        sizes={sizes}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } w-full h-full object-cover`}
        style={{
          backgroundImage: `url(${placeholder})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

// Specialized image components for different use cases
export const ProductImage = ({ src, alt, className, ...props }) => (
  <OptimizedImage
    src={src}
    alt={alt}
    className={`aspect-square ${className}`}
    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
    {...props}
  />
);

export const HeroImage = ({ src, alt, className, ...props }) => (
  <OptimizedImage
    src={src}
    alt={alt}
    className={`aspect-video ${className}`}
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
    {...props}
  />
);

export const AvatarImage = ({ src, alt, className, ...props }) => (
  <OptimizedImage
    src={src}
    alt={alt}
    className={`aspect-square rounded-full ${className}`}
    sizes="(max-width: 768px) 10vw, 5vw"
    {...props}
  />
);

export default OptimizedImage;
