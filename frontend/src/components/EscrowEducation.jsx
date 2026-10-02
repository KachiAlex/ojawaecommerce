import { useState, useEffect } from 'react';

const WalletEducation = ({ onComplete, userType = 'buyer' }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);

  // Text-to-speech functionality
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      // Stop any current speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      // Try to use a female voice if available
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') || 
        voice.name.toLowerCase().includes('zira') ||
        voice.name.toLowerCase().includes('samantha')
      );
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      
      utterance.onstart = () => setIsReading(true);
      utterance.onend = () => setIsReading(false);
      utterance.onerror = () => setIsReading(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsReading(false);
    }
  };

  // Auto-read current step
  useEffect(() => {
    const timer = setTimeout(() => {
      if (steps[currentStep]?.audioText) {
        speakText(steps[currentStep].audioText);
      }
    }, 500); // Small delay for smooth transition

    return () => {
      clearTimeout(timer);
      stopSpeaking();
    };
  }, [currentStep]);

  const steps = [
    {
      title: "Welcome to Ojawa Wallet Protection",
      subtitle: "Your money is 100% safe in your wallet",
      audioText: `Welcome to Ojawa! Your ${userType === 'buyer' ? 'payments' : 'earnings'} are protected by our secure wallet system. Let us show you how it works!`,
      content: (
        <div className="text-center">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse shadow-lg">
              <span className="text-4xl animate-bounce">🛡️</span>
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full animate-ping"></div>
          </div>
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-6 mb-6">
            <p className="text-lg font-medium text-gray-800 mb-4">
              🎉 Congratulations on joining Ojawa!
            </p>
            <p className="text-gray-600">
              Your {userType === 'buyer' ? 'payments' : 'earnings'} are protected by our secure wallet system. 
              Let us show you how it works!
            </p>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              <span>Trusted</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
              <span>Protected</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: userType === 'buyer' ? "Your Wallet Keeps Money Safe" : "Get Paid to Your Wallet",
      subtitle: userType === 'buyer' ? "We hold your payment in your wallet until you're happy" : "Customers pay into your secure wallet",
      audioText: userType === 'buyer' 
        ? "When you pay, your money goes into your secure Ojawa wallet - not directly to the vendor. This protects you from fraud and ensures you only pay when you're satisfied."
        : "When customers pay, their money is held securely in your Ojawa wallet until they confirm delivery. This builds trust and protects both you and your customers.",
      content: (
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto shadow-xl">
              <span className="text-4xl">🔒</span>
            </div>
            <div className="absolute -inset-4 border-4 border-blue-200 rounded-full animate-ping opacity-30"></div>
          </div>
          
          <div className="bg-white rounded-xl border-2 border-blue-100 p-6 mb-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-emerald-400 animate-pulse"></div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl">💰</span>
                </div>
                <p className="text-xs text-gray-600">Your Payment</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
                  <span className="text-xl">🔒</span>
                </div>
                <p className="text-xs text-blue-600 font-medium">Secure Wallet</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl">🏪</span>
                </div>
                <p className="text-xs text-gray-600">Vendor</p>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-800">
              {userType === 'buyer' 
                ? "Your money stays safe in your wallet until you confirm you're happy with your purchase!"
                : "Customer payments are held securely in your wallet until delivery is confirmed."
              }
            </p>
          </div>
          
          <div className="text-gray-600 leading-relaxed">
            {userType === 'buyer' 
              ? "When you pay, your money goes into your secure Ojawa wallet - not directly to the vendor. This protects you from fraud and ensures you only pay when you're satisfied."
              : "When customers pay, their money is held securely in your Ojawa wallet until they confirm delivery. This builds trust and protects both you and your customers."
            }
          </div>
        </div>
      )
    },
    {
      title: userType === 'buyer' ? "Only Pay When Satisfied" : "Delivery Confirmation",
      subtitle: userType === 'buyer' ? "You control when vendors get paid" : "Automatic payment upon confirmation",
      audioText: userType === 'buyer'
        ? "After you receive your order and confirm you're happy with it, the money is released to the vendor. If there's an issue, you can open a dispute and we'll help resolve it."
        : "Once the customer receives their order and confirms satisfaction, the money is automatically released to you. If there's a dispute, our team will mediate fairly.",
      content: (
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-xl">
              <span className="text-4xl animate-bounce">✅</span>
            </div>
            <div className="absolute -inset-4 border-4 border-green-200 rounded-full animate-pulse opacity-50"></div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-6 border border-green-200">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mb-1 animate-pulse">
                  <span className="text-white text-sm">📦</span>
                </div>
                <span className="text-xs text-gray-600">Delivery</span>
              </div>
              <div className="flex-1 h-0.5 bg-gradient-to-r from-green-400 to-emerald-400 animate-pulse"></div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center mb-1">
                  <span className="text-white text-sm">✅</span>
                </div>
                <span className="text-xs text-gray-600">Confirm</span>
              </div>
              <div className="flex-1 h-0.5 bg-gradient-to-r from-emerald-400 to-blue-400 animate-pulse"></div>
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mb-1">
                  <span className="text-white text-sm">💰</span>
                </div>
                <span className="text-xs text-gray-600">Payment</span>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-800">
              {userType === 'buyer' 
                ? "You have full control - vendors only get paid when you're satisfied!"
                : "Automatic and instant payment upon customer confirmation."
              }
            </p>
          </div>
          
          <div className="text-gray-600 leading-relaxed">
            {userType === 'buyer'
              ? "After you receive your order and confirm you're happy with it, the money is released to the vendor. If there's an issue, you can open a dispute and we'll help resolve it."
              : "Once the customer receives their order and confirms satisfaction, the money is automatically released to you. If there's a dispute, our team will mediate fairly."
            }
          </div>
        </div>
      )
    },
    {
      title: "Dispute Resolution",
      subtitle: "Fair protection for everyone",
      audioText: "If something goes wrong, our dispute resolution team will step in to mediate. We review evidence from both sides and make fair decisions to protect everyone involved.",
      content: (
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-xl">
              <span className="text-4xl">⚖️</span>
            </div>
            <div className="absolute -inset-4 border-4 border-purple-200 rounded-full animate-spin opacity-20" style={{animationDuration: '3s'}}></div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-6 border border-purple-200">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl">😟</span>
                </div>
                <p className="text-xs text-gray-600">Issue Reported</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
                  <span className="text-xl">👨‍⚖️</span>
                </div>
                <p className="text-xs text-purple-600 font-medium">Ojawa Reviews</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl">✅</span>
                </div>
                <p className="text-xs text-gray-600">Fair Resolution</p>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-800">
              Our expert team ensures fair outcomes for all disputes
            </p>
          </div>
          
          <div className="text-gray-600 leading-relaxed">
            If something goes wrong, our dispute resolution team will step in to mediate. 
            We review evidence from both sides and make fair decisions to protect everyone involved.
          </div>
          
          <div className="mt-6 flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-gray-600">24/7 Support</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></span>
              <span className="text-gray-600">Fair Mediation</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></span>
              <span className="text-gray-600">Expert Team</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full relative">
        {/* AI Assistant Button */}
        <button
          onClick={() => setShowAssistant(!showAssistant)}
          className="absolute -top-4 -right-4 w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-emerald-700 transition-colors animate-bounce"
          title="AI Assistant"
        >
          <span className="text-xl">🤖</span>
        </button>

        <div className="p-6">
          {/* Progress Indicator */}
          <div className="flex justify-center mb-6">
            <div className="flex space-x-3">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`relative w-3 h-3 rounded-full transition-all duration-300 ${
                    index <= currentStep ? 'bg-emerald-600 scale-110' : 'bg-gray-300'
                  }`}
                >
                  {index === currentStep && (
                    <div className="absolute -inset-1 bg-emerald-200 rounded-full animate-ping"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Audio Controls */}
          <div className="flex justify-center gap-3 mb-6">
            <button
              onClick={() => speakText(steps[currentStep].audioText)}
              disabled={isReading}
              className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-200 disabled:opacity-50"
            >
              <span className={isReading ? 'animate-pulse' : ''}>{isReading ? '🔊' : '🔉'}</span>
              {isReading ? 'Reading...' : 'Listen'}
            </button>
            {isReading && (
              <button
                onClick={stopSpeaking}
                className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium hover:bg-red-200"
              >
                <span>⏹️</span>
                Stop
              </button>
            )}
          </div>

          {/* Step Content */}
          <div className="mb-8">
            <div className="text-center mb-2">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {steps[currentStep].title}
              </h2>
              {steps[currentStep].subtitle && (
                <p className="text-sm text-emerald-600 font-medium">
                  {steps[currentStep].subtitle}
                </p>
              )}
            </div>
            <div className="transform transition-all duration-500 ease-in-out">
              {steps[currentStep].content}
            </div>
          </div>

          {/* AI Assistant Chat */}
          {showAssistant && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-white text-sm">🤖</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">Ojawa Assistant</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Hi! I'm here to help you understand how Ojawa works. Ask me anything!
                  </p>
                  
                  <div className="space-y-2">
                    <button 
                      onClick={() => speakText("Your Ojawa wallet means your money is held safely until you confirm you received your order. This protects you from fraud and ensures vendors deliver quality products.")}
                      className="block w-full text-left p-2 bg-white rounded-lg text-sm hover:bg-gray-50 border"
                    >
                      💡 How does my wallet work exactly?
                    </button>
                    <button 
                      onClick={() => speakText("If you're not satisfied with your order, you can open a dispute. Our team will review the case and help resolve it fairly. You may get a refund or the vendor may need to fix the issue.")}
                      className="block w-full text-left p-2 bg-white rounded-lg text-sm hover:bg-gray-50 border"
                    >
                      🤔 What if I'm not happy with my order?
                    </button>
                    <button 
                      onClick={() => speakText("Absolutely! All payments on Ojawa are protected by your wallet. Your money is never sent directly to vendors - it's held safely in your wallet until you confirm delivery.")}
                      className="block w-full text-left p-2 bg-white rounded-lg text-sm hover:bg-gray-50 border"
                    >
                      🛡️ Is my payment really safe?
                    </button>
                    <button 
                      onClick={() => speakText("You can choose from multiple delivery options with different logistics partners. Prices vary by distance and speed. You can also pick up directly from vendors for free.")}
                      className="block w-full text-left p-2 bg-white rounded-lg text-sm hover:bg-gray-50 border"
                    >
                      🚚 How does delivery work?
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSkip}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                Skip Tutorial
              </button>
              <button
                onClick={() => setShowAssistant(!showAssistant)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  showAssistant 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="text-sm">🤖</span>
                {showAssistant ? 'Hide Assistant' : 'AI Help'}
              </button>
            </div>
            
            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  ← Previous
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-800 shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                {currentStep === steps.length - 1 ? '🚀 Start Shopping!' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletEducation;
