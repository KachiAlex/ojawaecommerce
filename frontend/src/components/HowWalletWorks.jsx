import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const HowWalletWorks = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      title: "Create Account & Fund Wallet",
      description: "Sign up and add money to your secure Ojawa wallet using mobile money, bank transfer, or card.",
      icon: "💳",
      details: [
        "Multiple payment methods supported",
        "Instant wallet funding",
        "Secure encryption",
        "Real-time balance tracking"
      ]
    },
    {
      title: "Browse & Select Products",
      description: "Explore verified vendors and products across Africa. Your wallet balance is always visible.",
      icon: "🛍️",
      details: [
        "Verified vendor profiles",
        "Product reviews and ratings",
        "Category browsing",
        "Advanced search filters"
      ]
    },
    {
      title: "Place Order with Protection",
      description: "When you buy, your money is held securely in escrow - not sent to the vendor yet.",
      icon: "🔒",
      details: [
        "Escrow protection activated",
        "Order confirmation sent",
        "Vendor notified to ship",
        "Tracking information provided"
      ]
    },
    {
      title: "Track Your Delivery",
      description: "Monitor your order from shipment to delivery with real-time updates.",
      icon: "📦",
      details: [
        "Real-time tracking",
        "Delivery notifications",
        "Estimated delivery times",
        "Logistics partner updates"
      ]
    },
    {
      title: "Confirm Satisfaction",
      description: "Once delivered, confirm you're happy with your order to release payment to the vendor.",
      icon: "✅",
      details: [
        "Inspect your order",
        "Rate your experience",
        "Confirm satisfaction",
        "Automatic payment release"
      ]
    },
    {
      title: "Dispute Resolution",
      description: "If something's wrong, open a dispute for fair mediation. Your money stays protected.",
      icon: "⚖️",
      details: [
        "Easy dispute filing",
        "Evidence upload",
        "Fair mediation process",
        "Refund protection"
      ]
    }
  ];

  const benefits = [
    {
      title: "Buyer Protection",
      description: "Your money is safe until you confirm delivery",
      icon: "🛡️"
    },
    {
      title: "Vendor Trust",
      description: "Vendors get paid automatically upon satisfaction",
      icon: "🤝"
    },
    {
      title: "Dispute Resolution",
      description: "Fair mediation if issues arise",
      icon: "⚖️"
    },
    {
      title: "Low Fees",
      description: "Transparent pricing with competitive rates",
      icon: "💰"
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          How Ojawa Wallet Works
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Secure, transparent, and fair trading across Africa with wallet-protected payments
        </p>
      </div>

      {/* Interactive Steps */}
      <div className="mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Step Navigation */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">The Process</h2>
            {steps.map((step, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  activeStep === index
                    ? 'border-emerald-500 bg-emerald-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    activeStep === index ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{step.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                  </div>
                  {activeStep === index && (
                    <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Active Step Details */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl">
                {steps[activeStep].icon}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{steps[activeStep].title}</h3>
                <p className="text-gray-600">{steps[activeStep].description}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Key Features:</h4>
              {steps[activeStep].details.map((detail, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                  <span className="text-gray-700">{detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 text-center mb-8">
          Why Choose Ojawa Wallet?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <div key={index} className="bg-white rounded-lg border p-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                {benefit.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{benefit.title}</h3>
              <p className="text-gray-600 text-sm">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Security Features */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-8 mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 text-center mb-8">
          Security & Trust
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
              🔐
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Bank-Level Security</h3>
            <p className="text-gray-600 text-sm">256-bit encryption and secure servers protect your funds</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
              🆔
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Identity Verification</h3>
            <p className="text-gray-600 text-sm">Verified vendors and buyers create a trusted marketplace</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4">
              📞
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">24/7 Support</h3>
            <p className="text-gray-600 text-sm">Round-the-clock customer support for all users</p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Ready to Start Trading Securely?
        </h2>
        <p className="text-gray-600 mb-6">
          Join thousands of buyers and vendors across Africa using Ojawa's secure wallet system
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            Create Account
          </Link>
          <Link
            to="/products"
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HowWalletWorks;
