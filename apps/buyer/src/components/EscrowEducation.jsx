import { useState } from 'react';

const EscrowEducation = ({ onComplete, userType = 'buyer' }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Ojawa Escrow Protection",
      content: (
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🛡️</span>
          </div>
          <p className="text-gray-600 mb-6">
            Your {userType === 'buyer' ? 'payments' : 'earnings'} are protected by our secure escrow system. 
            Let us show you how it works!
          </p>
        </div>
      )
    },
    {
      title: userType === 'buyer' ? "Your Money is Safe" : "Get Paid Securely",
      content: (
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <p className="text-gray-600 mb-6">
            {userType === 'buyer' 
              ? "When you pay, your money goes into a secure escrow account - not directly to the vendor. This protects you from fraud and ensures you only pay when you're satisfied."
              : "When customers pay, their money is held securely in escrow until they confirm delivery. This builds trust and protects both you and your customers."
            }
          </p>
        </div>
      )
    },
    {
      title: userType === 'buyer' ? "Only Pay When Satisfied" : "Delivery Confirmation",
      content: (
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <p className="text-gray-600 mb-6">
            {userType === 'buyer'
              ? "After you receive your order and confirm you're happy with it, the money is released to the vendor. If there's an issue, you can open a dispute and we'll help resolve it."
              : "Once the customer receives their order and confirms satisfaction, the money is automatically released to you. If there's a dispute, our team will mediate fairly."
            }
          </p>
        </div>
      )
    },
    {
      title: "Dispute Resolution",
      content: (
        <div className="text-center">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚖️</span>
          </div>
          <p className="text-gray-600 mb-6">
            If something goes wrong, our dispute resolution team will step in to mediate. 
            We review evidence from both sides and make fair decisions to protect everyone involved.
          </p>
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
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6">
          {/* Progress Indicator */}
          <div className="flex justify-center mb-6">
            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index <= currentStep ? 'bg-emerald-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">
              {steps[currentStep].title}
            </h2>
            {steps[currentStep].content}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Skip Tutorial
            </button>
            
            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Previous
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
              >
                {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EscrowEducation;
