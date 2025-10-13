# 🚚 Simplified Logistics Pricing Model

## Overview

A clean, Google Maps-based pricing system with single per-km rate and automatic min/max caps.

---

## 💰 Default Platform Pricing

### Base Rate
**₦500 per kilometer**

### Caps by Category

| Category | Distance | Minimum | Maximum |
|----------|----------|---------|---------|
| **🏙️ Intracity** | 0-50 km | ₦2,000 | ₦10,000 |
| **🚛 Intercity** | 50+ km | ₦2,000 | ₦20,000 |

---

## 📊 How It Works

### Step 1: Calculate Distance
```
Google Maps API measures distance between:
- Vendor location → Buyer location
```

### Step 2: Determine Category
```javascript
if (distance ≤ 50km) → Intracity
if (distance > 50km) → Intercity
```

### Step 3: Calculate Price
```javascript
basePrice = distance × ratePerKm

// Apply caps
if (basePrice < minCharge) → use minCharge
if (basePrice > maxCharge) → use maxCharge
```

---

## 📝 Pricing Examples

### Example 1: Short Trip (2km)
```
Calculation: 2km × ₦500 = ₦1,000
Category: Intracity
Result: ₦2,000 (minimum applied) ✅
```

### Example 2: Medium Trip (5km)
```
Calculation: 5km × ₦500 = ₦2,500
Category: Intracity
Result: ₦2,500 (within limits) ✅
```

### Example 3: Long Intracity (40km)
```
Calculation: 40km × ₦500 = ₦20,000
Category: Intracity
Result: ₦10,000 (maximum applied) ✅
```

### Example 4: Short Intercity (60km)
```
Calculation: 60km × ₦500 = ₦30,000
Category: Intercity
Result: ₦20,000 (maximum applied) ✅
```

### Example 5: Long Intercity (100km)
```
Calculation: 100km × ₦500 = ₦50,000
Category: Intercity
Result: ₦20,000 (maximum applied) ✅
```

---

## 🎯 Logistics Partner Customization

### Partners can set their own rate per km

**Recommended Range:** ₦300 - ₦1,000 per km

**Min/max caps remain the same** (platform enforced):
- Intracity: ₦2,000 - ₦10,000
- Intercity: ₦2,000 - ₦20,000

### Example: Partner sets ₦400/km

| Distance | Calculation | Category | Final Price |
|----------|-------------|----------|-------------|
| 2km | 2 × ₦400 = ₦800 | Intracity | ₦2,000 (min) |
| 5km | 5 × ₦400 = ₦2,000 | Intracity | ₦2,000 |
| 30km | 30 × ₦400 = ₦12,000 | Intracity | ₦10,000 (max) |
| 60km | 60 × ₦400 = ₦24,000 | Intercity | ₦20,000 (max) |

### Example: Partner sets ₦700/km

| Distance | Calculation | Category | Final Price |
|----------|-------------|----------|-------------|
| 2km | 2 × ₦700 = ₦1,400 | Intracity | ₦2,000 (min) |
| 5km | 5 × ₦700 = ₦3,500 | Intracity | ₦3,500 |
| 15km | 15 × ₦700 = ₦10,500 | Intracity | ₦10,000 (max) |
| 60km | 60 × ₦700 = ₦42,000 | Intercity | ₦20,000 (max) |

---

## 🔧 Implementation

### Data Structure

```javascript
// Platform Defaults
DEFAULT_PLATFORM_PRICING = {
  ratePerKm: 500,
  intracity: {
    minCharge: 2000,
    maxCharge: 10000
  },
  intercity: {
    minCharge: 2000,
    maxCharge: 20000
  }
}

// Logistics Partner Profile
logisticsPartner = {
  companyName: "Fast Delivery Co.",
  ratePerKm: 450,  // Partner's custom rate
  pricing: {
    intracity: {
      minCharge: 2000,  // Platform enforced
      maxCharge: 10000  // Platform enforced
    },
    intercity: {
      minCharge: 2000,  // Platform enforced
      maxCharge: 20000  // Platform enforced
    }
  }
}
```

### Price Calculation Function

```javascript
calculateDeliveryPrice({
  distance: 25,  // from Google Maps
  ratePerKm: 500  // partner's rate or default
})

// Returns:
{
  distance: 25,
  category: 'intracity',
  ratePerKm: 500,
  calculatedPrice: 12500,  // 25 × 500
  minCharge: 2000,
  maxCharge: 10000,
  finalPrice: 10000,  // max cap applied
  breakdown: {
    baseCalculation: "25km × ₦500/km = ₦12,500",
    appliedRule: "Maximum charge applied (₦10,000)"
  }
}
```

---

## ✅ Benefits

### For Customers:
- ✅ **Transparent pricing** - know exactly how it's calculated
- ✅ **Fair pricing** - min charge protects short trips
- ✅ **Capped pricing** - max charge protects long trips
- ✅ **No surprises** - clear breakdown shown upfront

### For Logistics Partners:
- ✅ **Simple to set** - just one rate per km
- ✅ **Flexible** - can adjust rate anytime
- ✅ **Profitable** - min charge ensures baseline revenue
- ✅ **Competitive** - easy to compare with others

### For Platform:
- ✅ **Easy to explain** - simple pricing model
- ✅ **Fair marketplace** - standard caps for all
- ✅ **Google Maps integration** - accurate distances
- ✅ **Scalable** - works across all regions

---

## 🚀 Next Steps

### Phase 1: Basic Implementation ✅
- [x] Simplified pricing model
- [x] Single rate per km input
- [x] Platform default pricing
- [x] Registration form updated
- [x] Visual examples

### Phase 2: Google Maps Integration (Next)
- [ ] Connect to Google Maps Distance Matrix API
- [ ] Auto-calculate distance at checkout
- [ ] Show distance to customer
- [ ] Display pricing breakdown

### Phase 3: Checkout Integration (Next)
- [ ] Fetch logistics partners for route
- [ ] Show multiple quotes
- [ ] Allow customer to select partner
- [ ] Confirm booking with final price

### Phase 4: Partner Dashboard (Future)
- [ ] View delivery history
- [ ] Track earnings per km
- [ ] Adjust rate dynamically
- [ ] Analytics dashboard

---

## 📞 API Integration

### Google Maps Distance Matrix API

```javascript
// Request
POST https://maps.googleapis.com/maps/api/distancematrix/json
{
  origins: "Lagos, Nigeria",
  destinations: "Ibadan, Nigeria",
  key: "YOUR_API_KEY"
}

// Response
{
  rows: [{
    elements: [{
      distance: {
        text: "125 km",
        value: 125000  // meters
      },
      duration: {
        text: "2 hours 15 mins",
        value: 8100  // seconds
      },
      status: "OK"
    }]
  }]
}

// Convert to km
distanceKm = distance.value / 1000  // 125 km
```

### Price Calculation

```javascript
// Use Google Maps distance
const price = calculateDeliveryPrice({
  distance: 125,  // from Google Maps
  ratePerKm: 500
});

// price.finalPrice = ₦20,000 (intercity max)
```

---

## 🎓 FAQ

**Q: Why have minimum and maximum charges?**
A: Minimum protects short trips (covers fixed costs). Maximum protects customers from excessive charges on long trips.

**Q: Can partners set different rates for intracity vs intercity?**
A: No, to keep it simple, partners set one rate. The platform applies appropriate caps based on category.

**Q: What if Google Maps can't calculate distance?**
A: Partners can manually enter distance, or customer provides approximate distance.

**Q: Can customers negotiate prices?**
A: Prices are fixed based on distance and partner rate. Ensures fairness and transparency.

**Q: How often can partners change their rate?**
A: Partners can update rates anytime, but changes apply to new bookings only.

---

## 📈 Competitive Analysis

### Platform Comparison

| Platform | Rate/km | Min | Max (Intracity) | Max (Intercity) |
|----------|---------|-----|-----------------|-----------------|
| **Ojawa (Default)** | ₦500 | ₦2,000 | ₦10,000 | ₦20,000 |
| Competitor A | ₦600 | ₦3,000 | ₦15,000 | ₦25,000 |
| Competitor B | ₦450 | ₦1,500 | ₦12,000 | ₦22,000 |

**Ojawa's Advantage:**
- Competitive base rate
- Fair minimum charge
- Reasonable caps
- Google Maps integration

---

**Version:** 2.0 (Simplified)  
**Last Updated:** October 2024  
**Status:** ✅ Ready for Production

