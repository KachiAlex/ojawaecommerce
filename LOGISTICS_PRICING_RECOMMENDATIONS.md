# 🚚 Logistics Pricing Model - Professional Recommendations

## Executive Summary

This document outlines a comprehensive, scalable pricing model for logistics partners on the Ojawa platform. The model balances profitability, competitiveness, and transparency.

---

## 📊 Pricing Structure Overview

### 1. **Three-Tier Category System**

#### A. Intracity (Within City) - 0-50 km
**Recommended Rate: ₦50-150 per km**

**Characteristics:**
- Short distances, quick turnaround
- High frequency, lower per-trip revenue
- Traffic and congestion challenges
- Same-day/express delivery potential

**Best Practices:**
- Flat rate for first 5km (₦500-1000)
- Per-km pricing beyond 5km
- Rush hour surcharge (20-30%)
- Zone-based pricing for major cities

**Sample Pricing:**
```
0-5 km:    ₦500 flat rate
5-15 km:   ₦1,000 flat rate
15-30 km:  ₦1,800 flat rate
30-50 km:  ₦80 per km
```

#### B. Intercity (Between Cities) - 50-1000 km
**Recommended Rate: ₦40-100 per km**

**Characteristics:**
- Medium to long distances
- Highway driving, fewer stops
- 1-3 day delivery window
- Economies of scale opportunities

**Best Practices:**
- Tiered pricing by distance brackets
- Lower per-km rate for longer distances
- Fuel surcharge flexibility
- Popular route discounts

**Sample Pricing:**
```
50-100 km:   ₦60/km
100-300 km:  ₦55/km
300-500 km:  ₦50/km
500-1000 km: ₦45/km
```

#### C. International (Cross-Border) - 1000+ km
**Recommended Rate: ₦100-400 per km**

**Characteristics:**
- Complex documentation
- Customs clearance required
- Multi-modal transport
- Extended delivery times (3-14 days)

**Best Practices:**
- All-inclusive pricing
- Customs fee transparency
- Documentation handling fee
- Insurance mandatory

**Sample Pricing:**
```
1000-2000 km:  ₦200/km + customs fees
2000-5000 km:  ₦180/km + customs fees
5000+ km:      ₦150/km + customs fees
```

---

## 💰 Dynamic Pricing Factors

### 2. **Weight-Based Multipliers**

| Weight Category | Range | Multiplier | Rationale |
|----------------|-------|------------|-----------|
| Light | 0-5 kg | 1.0x | Base rate |
| Medium | 5-20 kg | 1.3x | Standard cargo |
| Heavy | 20-50 kg | 1.6x | Special handling |
| Bulk | 50+ kg | 2.0x | Requires larger vehicles |

**Implementation:**
```javascript
finalPrice = basePrice × weightMultiplier
```

### 3. **Delivery Speed Multipliers**

| Speed Tier | Delivery Time | Multiplier | Use Case |
|-----------|---------------|------------|----------|
| Same Day | Within 24hrs | 2.5x | Urgent documents, medical |
| Next Day | 1 business day | 1.8x | E-commerce rush |
| Express | 2-3 days | 1.5x | Premium service |
| Standard | 3-5 days | 1.0x | Most common |
| Economy | 5-7 days | 0.8x | Budget conscious |

### 4. **Additional Service Fees**

| Service | Fee Type | Amount | When to Apply |
|---------|----------|--------|---------------|
| Insurance | % of value | 2% | Items > ₦10,000 |
| Signature Required | Flat | ₦50 | High-value items |
| Fragile Handling | Flat | ₦100 | Glass, electronics |
| Cold Chain | Flat | ₦300 | Food, medicine |
| Hazardous Materials | Flat | ₦500 | Chemicals, batteries |
| Weekend Delivery | Percentage | 30% | Saturday/Sunday |
| Remote Area | Flat | ₦200 | Rural locations |
| Packaging | Flat | ₦50-500 | If provided by logistics |

---

## 🎯 Recommended Pricing Strategies

### Strategy 1: **Hybrid Flat + Per-Km Pricing** (RECOMMENDED)
✅ **Best for:** Most logistics partners

**How it works:**
- Flat rates for short distances (intracity)
- Per-km pricing for longer distances
- Clear, predictable pricing

**Example:**
```
Intracity:
- 0-5 km: ₦500
- 5-15 km: ₦1,000
- 15+ km: ₦80/km

Intercity:
- All distances: ₦50/km (tiered)
```

**Pros:**
- Customer-friendly for short trips
- Profitable for long distances
- Easy to understand

---

### Strategy 2: **Pure Per-Km Pricing**
✅ **Best for:** Specialized/long-distance operators

**How it works:**
- Single per-km rate for each category
- Add weight and speed multipliers
- Minimum charge enforced

**Example:**
```
Intracity: ₦80/km (min ₦500)
Intercity: ₦50/km (min ₦2,000)
International: ₦200/km (min ₦100,000)
```

**Pros:**
- Simple calculation
- Transparent pricing
- Easy to compare

**Cons:**
- May be expensive for short trips

---

### Strategy 3: **Zone-Based Pricing**
✅ **Best for:** Urban intracity operators

**How it works:**
- Divide city into zones
- Flat rate between zones
- No per-km calculation needed

**Example:**
```
Same zone: ₦500
Adjacent zones: ₦800
2 zones apart: ₦1,200
3+ zones apart: ₦1,500
```

**Pros:**
- Very simple for customers
- Predictable revenue
- No distance disputes

**Cons:**
- Requires zone mapping
- Less flexible

---

### Strategy 4: **Package Size Pricing**
✅ **Best for:** E-commerce focused

**How it works:**
- Price by package dimensions + weight
- Volumetric weight calculation
- Standardized package sizes

**Example:**
```
Small (shoebox): ₦500
Medium (briefcase): ₦1,000
Large (suitcase): ₦2,000
Extra Large: ₦3,500
```

**Formula:**
```
Volumetric Weight = (Length × Width × Height) / 5000
Chargeable Weight = Max(Actual Weight, Volumetric Weight)
```

---

## 📈 Advanced Pricing Features

### 5. **Dynamic Pricing (Optional)**

**Factors:**
- Time of day (surge pricing)
- Day of week (weekend premium)
- Demand level (high demand = +20%)
- Weather conditions (rain/flood = +15%)
- Holiday seasons (peak = +30%)

**Implementation:**
```javascript
finalPrice = basePrice × (1 + demandMultiplier + weatherMultiplier)
```

### 6. **Volume Discounts**

Reward frequent shippers:

| Monthly Volume | Discount |
|----------------|----------|
| 1-10 deliveries | 0% |
| 11-50 deliveries | 5% |
| 51-100 deliveries | 10% |
| 101-500 deliveries | 15% |
| 500+ deliveries | 20% |

### 7. **Return Trip Optimization**

- 30% discount if booking both pickup and return
- Reduces empty return trips
- Increases vehicle utilization

---

## 💡 Platform-Specific Recommendations for Ojawa

### For Logistics Partners:

1. **Start Conservative:**
   - Begin with standard rates
   - Adjust based on actual costs
   - Monitor profitability per route

2. **Track Your Metrics:**
   - Cost per km (fuel, maintenance, driver)
   - Utilization rate (% of time vehicle is loaded)
   - Average revenue per trip
   - Profit margin per category

3. **Competitive Pricing:**
   - Research competitor rates
   - Offer 5-10% better value on popular routes
   - Bundle services for better margins

4. **Transparent Communication:**
   - Clearly list all fees upfront
   - Explain surcharges
   - Provide itemized quotes

### For the Platform:

1. **Price Comparison Tool:**
   - Show customers multiple quotes
   - Highlight "best value"
   - Display estimated delivery time

2. **Automated Calculation:**
   - Use distance API for accurate km
   - Auto-categorize routes
   - Apply partner-specific rates

3. **Quality Metrics:**
   - Show on-time delivery %
   - Customer ratings
   - Price vs. performance index

4. **Smart Matching:**
   - Match orders to nearby drivers
   - Optimize routing
   - Suggest return trip opportunities

---

## 🔧 Implementation Checklist

### Phase 1: Basic Structure (Week 1)
- [ ] Implement three categories (intracity, intercity, international)
- [ ] Set base per-km rates for each category
- [ ] Add weight bracket multipliers
- [ ] Create pricing calculator

### Phase 2: Enhanced Features (Week 2)
- [ ] Add delivery speed options
- [ ] Implement additional service fees
- [ ] Create distance-based tiers
- [ ] Add minimum charge logic

### Phase 3: Advanced Features (Week 3-4)
- [ ] Dynamic pricing for peak times
- [ ] Volume discount system
- [ ] Route optimization suggestions
- [ ] Analytics dashboard for partners

### Phase 4: Optimization (Month 2+)
- [ ] A/B test pricing strategies
- [ ] Gather customer feedback
- [ ] Adjust rates based on data
- [ ] Add seasonal pricing

---

## 📊 Sample Price Comparison

### Example: 25kg Package, Lagos to Abuja (400km)

| Partner | Category | Base Rate | Weight | Speed | Total |
|---------|----------|-----------|--------|-------|-------|
| A | Intercity | ₦50/km | 1.6x | 1.0x | ₦32,000 |
| B | Intercity | ₦55/km | 1.6x | 1.0x | ₦35,200 |
| C | Intercity | ₦45/km | 1.6x | 1.5x | ₦43,200 |

**Winner:** Partner A (Standard delivery)
**Best for Speed:** Partner C (Express delivery)

---

## 🎓 Key Takeaways

1. **Balance is Key:**
   - Too cheap = unsustainable
   - Too expensive = no customers
   - Sweet spot = competitive + profitable

2. **Transparency Wins:**
   - Show all fees upfront
   - No hidden charges
   - Build trust

3. **Data-Driven Decisions:**
   - Track every trip
   - Analyze profitability
   - Adjust continuously

4. **Customer-Centric:**
   - Offer options (speed vs. price)
   - Flexible payment terms
   - Excellent service

---

## 📞 Support

For questions about implementing this pricing model:
- Email: logistics@ojawa.com
- WhatsApp: +234-XXX-XXXX
- Platform Support: In-app chat

---

**Document Version:** 1.0  
**Last Updated:** October 2024  
**Next Review:** January 2025

