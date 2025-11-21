import { useState, useEffect } from 'react';

const InitializationScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  const steps = [
    { text: "INITIALIZING OJAWA", duration: 1500 },
    { text: "THE AFRICAN DIGITAL MARKET", duration: 2000 },
    { text: "CONNECTING AFRICA WITH TRADE", duration: 2500 },
    { text: "LOADING SECURE PLATFORM", duration: 1500 },
    { text: "WELCOME TO OJAWA", duration: 1000 }
  ];

  useEffect(() => {
    // Show logo first
    setTimeout(() => setShowLogo(true), 200);
    // Show text after logo
    setTimeout(() => setShowText(true), 800);
    // Show progress after text
    setTimeout(() => setShowProgress(true), 1200);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setIsComplete(true);
          setTimeout(() => {
            onComplete();
          }, 1500);
          return 100;
        }
        return prev + 1.5;
      });
    }, 30);

    return () => clearInterval(timer);
  }, [onComplete]);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(stepTimer);
  }, []);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-teal-900 to-blue-900">
        <div className="absolute inset-0 bg-black/20"></div>
        {/* Animated particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>
      </div>

      <div className="relative z-10 text-center text-white px-8 max-w-2xl mx-auto">
        {/* Logo with dramatic entrance */}
        <div className={`mb-12 transition-all duration-1000 ${showLogo ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-white/20 rounded-full blur-xl scale-150 animate-pulse"></div>
            {/* Logo container */}
            <div className="relative w-32 h-32 mx-auto mb-6 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
              <img 
                src="/logos/ojawa-logo.png" 
                alt="Ojawa Logo" 
                className="w-20 h-20 object-contain animate-spin-slow"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="hidden text-4xl font-bold text-white animate-pulse">O</div>
            </div>
          </div>
        </div>

        {/* Brand Name with typewriter effect */}
        <div className={`mb-8 transition-all duration-1000 ${showText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h1 className="text-6xl font-black mb-4 text-white tracking-wider animate-glow">
            OJAWA
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-emerald-400 to-blue-400 mx-auto rounded-full"></div>
        </div>

        {/* Current Step Text with dramatic styling */}
        <div className={`mb-12 min-h-[3rem] flex items-center justify-center transition-all duration-1000 ${showText ? 'opacity-100' : 'opacity-0'}`}>
          <div className="relative">
            <p className="text-2xl font-bold text-white/90 tracking-wider animate-pulse">
              {steps[currentStep]?.text || "LOADING..."}
            </p>
            {/* Underline animation */}
            <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent animate-slide"></div>
          </div>
        </div>

        {/* Progress Bar with enhanced styling */}
        <div className={`mb-8 transition-all duration-1000 ${showProgress ? 'opacity-100' : 'opacity-0'}`}>
          <div className="relative">
            <div className="w-full bg-white/10 rounded-full h-3 mb-4 overflow-hidden">
              <div 
                className="h-3 bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400 rounded-full transition-all duration-300 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
            </div>
            <p className="text-lg font-semibold text-white/80 tracking-wider">
              {progress.toFixed(0)}% COMPLETE
            </p>
          </div>
        </div>

        {/* Tagline with enhanced styling */}
        <div className={`text-white/90 text-lg space-y-2 transition-all duration-1000 delay-500 ${showText ? 'opacity-100' : 'opacity-0'}`}>
          <p className="font-bold tracking-wider">THE AFRICAN DIGITAL MARKET</p>
          <p className="text-sm font-medium tracking-widest text-white/70">CONNECTING AFRICA WITH TRADE</p>
        </div>

        {/* Loading Animation with enhanced dots */}
        <div className={`mt-12 flex justify-center transition-all duration-1000 delay-700 ${showProgress ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex space-x-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-3 h-3 bg-white/60 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.1}s` }}
              ></div>
            ))}
          </div>
        </div>

        {/* Completion Message */}
        {isComplete && (
          <div className="mt-8 animate-fade-in">
            <div className="inline-flex items-center space-x-2 bg-emerald-500/20 px-6 py-3 rounded-full border border-emerald-400/30">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <p className="text-emerald-200 font-semibold tracking-wider">
                PLATFORM READY
              </p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 5px rgba(255,255,255,0.5), 0 0 10px rgba(255,255,255,0.3), 0 0 15px rgba(255,255,255,0.1); }
          50% { text-shadow: 0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.6), 0 0 30px rgba(255,255,255,0.4); }
        }
        
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
        
        .animate-slide {
          animation: slide 2s ease-in-out infinite;
        }
        
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
      `}</style>
    </div>
  );
};

export default InitializationScreen;
