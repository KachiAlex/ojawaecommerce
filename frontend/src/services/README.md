# Logistics Pricing Service

A comprehensive logistics pricing system for eCommerce applications with escrow payment integration.

## Features

- **Dynamic Pricing**: Distance, weight, time, and zone-based pricing
- **Multiple Delivery Types**: Standard and express delivery options
- **Partner Integration**: Automatic partner selection and rating
- **Real-time Calculation**: Live pricing updates
- **Analytics**: Calculation tracking and audit logs
- **Admin Dashboard**: Configurable pricing parameters

## Quick Start

### 1. Basic Usage

```javascript
import logisticsPricingService from './services/logisticsPricingService';

// Calculate delivery fee
const result = await logisticsPricingService.calculateDeliveryFee({
  pickup: 'Ikeja, Lagos',
  dropoff: 'Yaba, Lagos',
  weight: 3,
  type: 'express'
});

console.log(result);
// {
//   success: true,
//   deliveryFee: 2250,
//   breakdown: { ... },
//   eta: 'Same Day',
//   partner: { id: 'gig', name: 'GIG Logistics', rating: 4.5 }
// }
```

### 2. React Hook Usage

```javascript
import { useLogisticsPricing } from './hooks/useLogisticsPricing';

function CheckoutComponent() {
  const { calculateDeliveryFee, loading, result, error } = useLogisticsPricing();

  const handleCalculate = async () => {
    await calculateDeliveryFee({
      pickup: 'Ikeja, Lagos',
      dropoff: 'Yaba, Lagos',
      weight: 2,
      type: 'standard'
    });
  };

  return (
    <div>
      <button onClick={handleCalculate} disabled={loading}>
        Calculate Delivery
      </button>
      {result && <p>Fee: ₦{result.deliveryFee}</p>}
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

### 3. React Component Usage

```javascript
import LogisticsPricingCalculator from './components/LogisticsPricingCalculator';

function CheckoutPage() {
  const handlePriceCalculated = (calculation) => {
    console.log('Delivery fee:', calculation.deliveryFee);
    // Update checkout total
  };

  return (
    <LogisticsPricingCalculator
      onPriceCalculated={handlePriceCalculated}
      initialPickup="Ikeja, Lagos"
      initialDropoff="Yaba, Lagos"
      initialWeight={2}
    />
  );
}
```

## API Endpoints

### POST /calculate-delivery

Calculate delivery fee for a specific route.

**Request:**
```json
{
  "pickup": "Ikeja, Lagos",
  "dropoff": "Yaba, Lagos",
  "weight": 3,
  "type": "express",
  "partner": "gig-logistics"
}
```

**Response:**
```json
{
  "success": true,
  "deliveryFee": 2250,
  "breakdown": {
    "baseFare": 300,
    "distanceFee": 1000,
    "weightFee": 50,
    "deliveryTypeMultiplier": 1.5,
    "timeMultiplier": 1.0,
    "zoneMultiplier": 1.0,
    "totalMultiplier": 1.5
  },
  "eta": "Same Day",
  "partner": {
    "id": "gig-logistics",
    "name": "GIG Logistics",
    "rating": 4.5
  },
  "distance": 15.2,
  "zone": "lagos_intra",
  "calculatedAt": "2024-01-15T10:30:00.000Z"
}
```

### POST /calculate-delivery-options

Get both standard and express delivery options.

**Request:**
```json
{
  "pickup": "Ikeja, Lagos",
  "dropoff": "Yaba, Lagos",
  "weight": 2
}
```

**Response:**
```json
{
  "success": true,
  "options": [
    {
      "type": "standard",
      "deliveryFee": 1500,
      "eta": "2-3 Days",
      "breakdown": { ... },
      "partner": { ... }
    },
    {
      "type": "express",
      "deliveryFee": 2250,
      "eta": "Same Day",
      "breakdown": { ... },
      "partner": { ... }
    }
  ]
}
```

## Pricing Configuration

### Base Configuration

```javascript
const baseConfig = {
  baseFare: 300,           // Base fare in NGN
  ratePerKm: 50,           // Rate per kilometer
  ratePerKg: 25,           // Rate per extra kg
  expressMultiplier: 1.5,  // Express delivery multiplier
  intercityRatePerKm: 35,  // Lower rate for intercity
  maxWeight: 50,           // Maximum weight in kg
  minDeliveryFee: 200,     // Minimum delivery fee
  maxDeliveryFee: 5000     // Maximum delivery fee
};
```

### Time-based Multipliers

```javascript
const timeMultipliers = {
  'morning': 1.0,    // 6 AM - 12 PM
  'afternoon': 1.1,  // 12 PM - 6 PM
  'evening': 1.2,    // 6 PM - 10 PM
  'night': 1.5       // 10 PM - 6 AM
};
```

### Zone-based Multipliers

```javascript
const zoneMultipliers = {
  'lagos_intra': 1.0,   // Within Lagos
  'lagos_inter': 1.2,   // Lagos to other states
  'abuja_intra': 1.0,   // Within Abuja
  'abuja_inter': 1.3,   // Abuja to other states
  'other_intra': 1.1,   // Within other states
  'other_inter': 1.4    // Between different states
};
```

## Integration with Escrow System

### Checkout Integration

```javascript
import CheckoutLogisticsSelector from './components/CheckoutLogisticsSelector';

function CheckoutPage() {
  const [cartItems, setCartItems] = useState([]);
  const [buyerAddress, setBuyerAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);

  const handleLogisticsSelected = (logistics) => {
    setDeliveryFee(logistics.deliveryFee);
    // Update escrow total
    const escrowTotal = calculateProductTotal(cartItems) + logistics.deliveryFee;
    updateEscrowTotal(escrowTotal);
  };

  return (
    <div>
      <CheckoutLogisticsSelector
        cartItems={cartItems}
        buyerAddress={buyerAddress}
        onLogisticsSelected={handleLogisticsSelected}
      />
    </div>
  );
}
```

### Escrow Calculation

```javascript
// Calculate total escrow amount
const calculateEscrowTotal = (productCost, deliveryFee) => {
  return productCost + deliveryFee;
};

// Allocate fees for disbursement
const allocateFees = (escrowTotal, deliveryFee) => {
  return {
    vendorFee: escrowTotal - deliveryFee,
    logisticsFee: deliveryFee,
    totalEscrow: escrowTotal
  };
};
```

## Advanced Features

### Dynamic Pricing

```javascript
// Update pricing configuration
await logisticsPricingService.updatePricingConfig({
  baseFare: 350,
  ratePerKm: 60,
  expressMultiplier: 1.8
});
```

### Partner Management

```javascript
// Get available partners for a zone
const partners = await logisticsPricingService.getLogisticsPartners(null, 'lagos_intra');

// Select specific partner
const result = await logisticsPricingService.calculateDeliveryFee({
  pickup: 'Ikeja, Lagos',
  dropoff: 'Yaba, Lagos',
  weight: 2,
  partner: 'gig-logistics'
});
```

### Analytics and Tracking

```javascript
// All calculations are automatically stored for analytics
const calculation = await logisticsPricingService.calculateDeliveryFee({
  pickup: 'Ikeja, Lagos',
  dropoff: 'Yaba, Lagos',
  weight: 3,
  type: 'express'
});

// Calculation is stored in Firestore for audit and analytics
```

## Error Handling

```javascript
try {
  const result = await logisticsPricingService.calculateDeliveryFee(params);
  
  if (result.success) {
    // Use result.deliveryFee
  } else {
    // Handle error: result.error
  }
} catch (error) {
  // Handle exception
  console.error('Calculation failed:', error);
}
```

## Testing

```javascript
// Test delivery calculation
const testCalculation = async () => {
  const result = await logisticsPricingService.calculateDeliveryFee({
    pickup: 'Ikeja, Lagos',
    dropoff: 'Yaba, Lagos',
    weight: 2,
    type: 'standard'
  });
  
  console.assert(result.success, 'Calculation should succeed');
  console.assert(result.deliveryFee > 0, 'Fee should be positive');
  console.assert(result.eta, 'ETA should be provided');
};
```

## Deployment

### Environment Variables

```bash
# Firebase configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# API configuration
PORT=3001
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## Support

For questions or issues, please contact the development team or create an issue in the repository.
