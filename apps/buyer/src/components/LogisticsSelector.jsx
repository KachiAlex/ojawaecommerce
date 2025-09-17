import { useState } from 'react';

const LogisticsSelector = ({ vendorLocation, buyerLocation, onSelect }) => {
  const [selectedLogistics, setSelectedLogistics] = useState(null);

  // Mock logistics companies with routes and pricing
  const availableLogistics = [
    {
      id: 'swift-001',
      company: 'Swift Logistics',
      logo: '🚚',
      price: '₦5,000',
      currency: 'NGN',
      estimatedDays: '1-2',
      rating: 4.8,
      reviews: 1234,
      features: ['Real-time tracking', 'Insurance included', 'SMS notifications'],
      description: 'Fast and reliable delivery service across Nigeria'
    },
    {
      id: 'express-002',
      company: 'Express Delivery Co.',
      logo: '⚡',
      price: '₦6,500',
      currency: 'NGN',
      estimatedDays: '1',
      rating: 4.6,
      reviews: 856,
      features: ['Same day delivery', 'Premium handling', 'Live chat support'],
      description: 'Premium express delivery with same-day options'
    },
    {
      id: 'reliable-003',
      company: 'Reliable Transport',
      logo: '🛻',
      price: '₦4,200',
      currency: 'NGN',
      estimatedDays: '2-3',
      rating: 4.5,
      reviews: 2100,
      features: ['Affordable rates', 'Bulk discounts', 'Flexible scheduling'],
      description: 'Cost-effective delivery solutions for all package sizes'
    },
    {
      id: 'cargo-004',
      company: 'Pan-African Cargo',
      logo: '✈️',
      price: '₦8,000',
      currency: 'NGN',
      estimatedDays: '3-5',
      rating: 4.7,
      reviews: 567,
      features: ['Cross-border delivery', 'Customs handling', 'International tracking'],
      description: 'Specialized in cross-border deliveries across Africa'
    }
  ];

  const handleSelect = (logistics) => {
    setSelectedLogistics(logistics);
    if (onSelect) {
      onSelect(logistics);
    }
  };

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Delivery Option</h3>
        <div className="text-sm text-gray-600">
          <p>From: <span className="font-medium">{vendorLocation}</span></p>
          <p>To: <span className="font-medium">{buyerLocation}</span></p>
        </div>
      </div>

      <div className="space-y-4">
        {availableLogistics.map((logistics) => (
          <div
            key={logistics.id}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedLogistics?.id === logistics.id
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleSelect(logistics)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">{logistics.logo}</span>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{logistics.company}</h4>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">⭐</span>
                      <span className="text-sm font-medium">{logistics.rating}</span>
                      <span className="text-sm text-gray-500">({logistics.reviews})</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{logistics.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    {logistics.features.map((feature, index) => (
                      <span
                        key={index}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>📅 {logistics.estimatedDays} days</span>
                    <span>📍 Door-to-door</span>
                    <span>🔒 Insured</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-xl font-bold text-gray-900">{logistics.price}</div>
                <div className="text-sm text-gray-500">Delivery fee</div>
              </div>
            </div>
            
            {selectedLogistics?.id === logistics.id && (
              <div className="mt-4 pt-4 border-t border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-700">
                  <span>✓</span>
                  <span className="text-sm font-medium">Selected for delivery</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-3">
          <span className="text-blue-600 text-xl">ℹ️</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Delivery Protection</p>
            <p>All deliveries are protected by Ojawa's escrow system. Your payment is held securely until you confirm delivery.</p>
          </div>
        </div>
      </div>

      {selectedLogistics && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Selected: {selectedLogistics.company}</p>
              <p className="text-sm text-gray-600">Estimated delivery: {selectedLogistics.estimatedDays} days</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">{selectedLogistics.price}</p>
              <p className="text-sm text-gray-500">+ Product cost</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsSelector;
