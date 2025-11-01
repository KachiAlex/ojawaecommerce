import { useEffect } from 'react';

const AnimatedSplash = ({ onDone }) => {
  useEffect(() => {
    // 5 second duration
    const t = setTimeout(() => onDone?.(), 5000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: '#ffffff', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <style>{`
        @keyframes splashZoom {
          0% { 
            opacity: 0; 
            transform: scale(0.3);
          }
          10% { 
            opacity: 1; 
            transform: scale(1.3);
          }
          20% { 
            opacity: 1; 
            transform: scale(0.85);
          }
          30% { 
            opacity: 1; 
            transform: scale(1.15);
          }
          40% { 
            opacity: 1; 
            transform: scale(0.95);
          }
          50% { 
            opacity: 1; 
            transform: scale(1.08);
          }
          60% { 
            opacity: 1; 
            transform: scale(1.0);
          }
          70% { 
            opacity: 1; 
            transform: scale(1.06);
          }
          80% { 
            opacity: 1; 
            transform: scale(1.0);
          }
          90% { 
            opacity: 1; 
            transform: scale(1.03);
          }
          100% { 
            opacity: 1; 
            transform: scale(1.0);
          }
        }
      `}</style>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <img
          src="/logos/ojawa-logo.png"
          alt="Ojawa"
          style={{
            width: 160,
            height: 'auto',
            animation: 'splashZoom 4.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }}
          onError={(e) => { 
            e.currentTarget.src = '/logos/ojawa-logo.svg';
            e.currentTarget.style.width = '160px';
          }}
        />
      </div>
    </div>
  );
};

export default AnimatedSplash;


