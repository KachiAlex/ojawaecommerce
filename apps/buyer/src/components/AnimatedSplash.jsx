import { useEffect } from 'react';

const AnimatedSplash = ({ onDone }) => {
  useEffect(() => {
    // Show splash for 5 seconds, then call onDone
    const timer = setTimeout(() => {
      onDone?.();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #059669 50%, #0e7490 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <style>{`
        @keyframes logoZoom {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .logo-animation {
          animation: logoZoom 5s ease-out forwards;
        }
      `}</style>

      {/* Logo with zoom animation */}
      <div className="logo-animation">
        <img
          src="/logos/ojawa-logo.png"
          alt="Ojawa"
          style={{
            width: '200px',
            height: 'auto',
            maxWidth: '80%',
          }}
          onError={(e) => {
            e.currentTarget.src = '/logos/ojawa-logo.svg';
          }}
        />
      </div>
    </div>
  );
};

export default AnimatedSplash;
