import { useEffect } from 'react';

const AnimatedSplash = ({ onDone }) => {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), 900);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: '#ffffff', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <style>{`
        @keyframes splashPop {
          0% { opacity: 0; transform: scale(0.92); }
          60% { opacity: 1; transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1.00); }
        }
      `}</style>
      <img
        src="/logos/ojawa-logo.png"
        alt="Ojawa"
        style={{
          width: 140, height: 'auto', animation: 'splashPop 800ms cubic-bezier(0.2, 0.7, 0.2, 1.0) forwards'
        }}
        onError={(e) => { e.currentTarget.src = '/logos/ojawa-logo.svg'; }}
      />
    </div>
  );
};

export default AnimatedSplash;


