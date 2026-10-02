import { useEffect } from 'react';

const AnimatedSplash = ({ onDone }) => {
  useEffect(() => {
    // Show splash for 3 seconds, then call onDone
    const timer = setTimeout(() => {
      onDone?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      overflow: 'hidden',
      background: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <style>{`
        @keyframes logoZoom {
          0% { transform: scale(0.3); }
          100% { transform: scale(1); }
        }
        
        .logo-animation {
          animation: logoZoom 3s ease-out forwards;
        }
      `}</style>

      {/* Logo with ONLY zoom animation */}
      <div className="logo-animation">
        <img
          src="/logos/ojawa-logo-lockup.svg"
          alt="Ojawa"
          style={{
            width: '220px',
            height: 'auto',
            maxWidth: '80%',
          }}
          onError={(e) => {
            e.currentTarget.src = '/logos/ojawa-logo.png';
          }}
        />
      </div>
    </div>
  );
};

export default AnimatedSplash;
