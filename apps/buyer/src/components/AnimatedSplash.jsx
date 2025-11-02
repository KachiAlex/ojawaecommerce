import { useEffect, useState } from 'react';

const AnimatedSplash = ({ onDone }) => {
  const [progress, setProgress] = useState(0);
  const [logoScale, setLogoScale] = useState(0);
  const [showText, setShowText] = useState(false);
  const [particles, setParticles] = useState([]);
  const [glowIntensity, setGlowIntensity] = useState(0.5);

  useEffect(() => {
    // Create animated particles with varied properties
    const particleArray = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 4,
      size: 2 + Math.random() * 4,
      opacity: 0.3 + Math.random() * 0.5,
    }));
    setParticles(particleArray);

    // Animate logo entrance
    setTimeout(() => {
      setLogoScale(1);
    }, 100);

    // Show text after logo
    setTimeout(() => {
      setShowText(true);
    }, 800);

    // Animate glow intensity
    const glowInterval = setInterval(() => {
      setGlowIntensity(prev => prev === 0.5 ? 1 : 0.5);
    }, 1500);

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          clearInterval(glowInterval);
          // Wait a bit more for animations to complete
          setTimeout(() => {
            onDone?.();
          }, 500);
          return 100;
        }
        return prev + 1.2;
      });
    }, 40);

    return () => {
      clearInterval(progressInterval);
      clearInterval(glowInterval);
    };
  }, [onDone]);

  return (
    <div className="splash-container" style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      overflow: 'hidden',
    }}>
      {/* Animated background gradient */}
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes logoEntrance {
          0% {
            opacity: 0;
            transform: scale(0) rotate(-180deg);
          }
          50% {
            opacity: 1;
            transform: scale(1.3) rotate(-90deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(360deg);
          }
        }
        
        @keyframes logoFloat {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-20px) scale(1.05);
          }
        }
        
        @keyframes logoPulse {
          0%, 100% {
            box-shadow: 0 0 30px rgba(255, 255, 255, 0.4),
                        0 0 60px rgba(16, 185, 129, 0.5),
                        0 0 90px rgba(59, 130, 246, 0.4),
                        0 0 120px rgba(16, 185, 129, 0.2);
            filter: drop-shadow(0 0 30px rgba(255, 255, 255, 0.6));
          }
          50% {
            box-shadow: 0 0 50px rgba(255, 255, 255, 0.7),
                        0 0 100px rgba(16, 185, 129, 0.7),
                        0 0 150px rgba(59, 130, 246, 0.6),
                        0 0 200px rgba(16, 185, 129, 0.4);
            filter: drop-shadow(0 0 50px rgba(255, 255, 255, 1));
          }
        }
        
        @keyframes textSlideUp {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes textGlow {
          0%, 100% {
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.6),
                         0 0 40px rgba(16, 185, 129, 0.5),
                         0 0 60px rgba(59, 130, 246, 0.4);
          }
          50% {
            text-shadow: 0 0 30px rgba(255, 255, 255, 1),
                         0 0 60px rgba(16, 185, 129, 0.8),
                         0 0 100px rgba(59, 130, 246, 0.6),
                         0 0 150px rgba(16, 185, 129, 0.4);
          }
        }
        
        @keyframes particleFloat {
          0% {
            transform: translateY(100vh) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-20vh) translateX(${Math.random() * 100 - 50}px) rotate(360deg);
            opacity: 0;
          }
        }
        
        @keyframes progressShimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        
        @keyframes ripple {
          0% {
            transform: scale(0);
            opacity: 0.8;
            border-width: 2px;
          }
          50% {
            opacity: 0.4;
            border-width: 3px;
          }
          100% {
            transform: scale(6);
            opacity: 0;
            border-width: 1px;
          }
        }
        
        @keyframes rotate360 {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes scaleInOut {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
        }
        
        @keyframes floatBackground {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
          }
          25% {
            transform: translate(10px, -10px) rotate(90deg);
          }
          50% {
            transform: translate(0, -20px) rotate(180deg);
          }
          75% {
            transform: translate(-10px, -10px) rotate(270deg);
          }
        }
        
        .splash-container {
          background: linear-gradient(-45deg, #0f172a, #1e3a8a, #059669, #0e7490, #7c3aed);
          background-size: 500% 500%;
          animation: gradientShift 15s ease infinite;
          position: relative;
        }
        
        .splash-container::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 30% 50%, rgba(16, 185, 129, 0.3) 0%, transparent 50%),
                      radial-gradient(circle at 70% 80%, rgba(59, 130, 246, 0.3) 0%, transparent 50%);
          animation: floatBackground 20s ease infinite;
        }
        
        .logo-container {
          animation: logoEntrance 1.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     logoFloat 4s ease-in-out infinite 1.8s;
        }
        
        .logo-glow {
          animation: logoPulse 2.5s ease-in-out infinite;
        }
        
        .text-animation {
          animation: textSlideUp 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     textGlow 3s ease-in-out infinite 1s;
        }
        
        .particle {
          animation: particleFloat var(--duration) linear infinite;
          animation-delay: var(--delay);
        }
        
        .progress-bar {
          background: linear-gradient(90deg, 
            #10b981 0%, 
            #3b82f6 50%, 
            #8b5cf6 100%);
          background-size: 200% 100%;
          animation: progressShimmer 2s linear infinite;
        }
        
        .ripple-effect {
          animation: ripple 3s ease-out infinite;
        }
        
        .rotating-ring {
          animation: rotate360 10s linear infinite;
        }
        
        .pulsing-dot {
          animation: scaleInOut 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* Animated geometric shapes in background */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: '100px',
              height: '100px',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `rotate360 ${20 + Math.random() * 20}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Floating particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="particle"
          style={{
            position: 'absolute',
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            background: `rgba(255, 255, 255, ${particle.opacity})`,
            borderRadius: '50%',
            '--duration': `${particle.duration}s`,
            '--delay': `${particle.delay}s`,
          }}
        />
      ))}

      {/* Ripple effects */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="rotating-ring absolute w-64 h-64 border-4 border-white/20 rounded-full"
          style={{ animationDuration: '15s' }}
        />
        <div
          className="rotating-ring absolute w-80 h-80 border-4 border-white/10 rounded-full"
          style={{ animationDuration: '20s', animationDirection: 'reverse' }}
        />
        <div
          className="ripple-effect absolute w-32 h-32 border-2 border-white/40 rounded-full"
          style={{ animationDelay: '0s' }}
        />
        <div
          className="ripple-effect absolute w-40 h-40 border-2 border-white/30 rounded-full"
          style={{ animationDelay: '1s' }}
        />
        <div
          className="ripple-effect absolute w-48 h-48 border-2 border-white/20 rounded-full"
          style={{ animationDelay: '2s' }}
        />
      </div>

      {/* Main content */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        zIndex: 10,
      }}>
        {/* Logo with enhanced glow effect */}
        <div
          className="logo-container"
          style={{
            position: 'relative',
            padding: '50px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          }}
        >
          <div
            className="logo-glow"
            style={{
              position: 'absolute',
              inset: '-30px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
            }}
          />
          <img
            src="/logos/ojawa-logo.png"
            alt="Ojawa"
            style={{
              width: 180,
              height: 'auto',
              position: 'relative',
              zIndex: 1,
              filter: 'drop-shadow(0 0 30px rgba(255,255,255,0.8))',
            }}
            onError={(e) => {
              e.currentTarget.src = '/logos/ojawa-logo.svg';
              e.currentTarget.style.width = '180px';
            }}
          />
        </div>

        {/* Brand text with enhanced styling */}
        {showText && (
          <div
            className="text-animation"
            style={{
              marginTop: '50px',
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                fontSize: '52px',
                fontWeight: 900,
                letterSpacing: '6px',
                marginBottom: '15px',
                background: 'linear-gradient(135deg, #ffffff, #10b981, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              OJAWA
            </h1>
            <div
              className="pulsing-dot"
              style={{
                width: '120px',
                height: '4px',
                background: 'linear-gradient(90deg, transparent, white, transparent)',
                margin: '0 auto',
                borderRadius: '2px',
              }}
            />
            <p
              style={{
                marginTop: '25px',
                fontSize: '18px',
                fontWeight: 600,
                letterSpacing: '3px',
                opacity: 0.95,
              }}
            >
              THE AFRICAN DIGITAL MARKET
            </p>
          </div>
        )}

        {/* Enhanced progress bar */}
        <div
          style={{
            marginTop: '70px',
            width: '350px',
            maxWidth: '85%',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '6px',
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div
              className="progress-bar"
              style={{
                height: '100%',
                width: `${progress}%`,
                borderRadius: '10px',
                transition: 'width 0.3s ease',
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
              }}
            />
          </div>
          <p
            style={{
              marginTop: '20px',
              textAlign: 'center',
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '2px',
              opacity: 0.9,
            }}
          >
            {Math.round(progress)}%
          </p>
        </div>

        {/* Loading dots with enhanced animation */}
        {showText && (
          <div
            style={{
              marginTop: '50px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="pulsing-dot"
                style={{
                  width: '12px',
                  height: '12px',
                  background: 'white',
                  borderRadius: '50%',
                  boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimatedSplash;
