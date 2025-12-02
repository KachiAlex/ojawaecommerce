# Promotional Campaign System Documentation

## Overview

The Ojawa promotional campaign system allows administrators to create and manage promotional campaigns (like Black Friday, Flash Sales, etc.) and ensures vendor compliance through three participation models.

## Features

### 1. Campaign Types
- **Black Friday**: Major sales events
- **Flash Sale**: Short-duration promotions
- **Holiday Sale**: Holiday-specific campaigns
- **Seasonal**: Seasonal promotions
- **Custom**: Custom campaign types

### 2. Participation Models

#### a. Required Participation (`required`)
- **All approved vendors MUST participate**
- Vendors are automatically enrolled when campaign is activated
- Vendors receive notifications and cannot opt-out
- Best for: Major platform-wide events (Black Friday, major holidays)

#### b. Opt-In Participation (`opt_in`)
- **Vendors choose to participate**
- Vendors receive invitations and can join voluntarily
- Vendors select which products to include
- Best for: Optional promotions, vendor-driven campaigns

#### c. Invited Participation (`invited`)
- **Only invited vendors can participate**
- Admin specifies list of vendor IDs
- Selected vendors receive exclusive invitations
- Best for: Exclusive promotions, vendor rewards

## Implementation Guide

### For Administrators

#### 1. Create a Campaign

```javascript
// Example: Creating a Black Friday campaign
const campaignData = {
  name: "Black Friday 2024",
  description: "Biggest sale of the year!",
  type: "black_friday",
  participationType: "required", // or "opt_in" or "invited"
  discountType: "percentage", // or "fixed"
  discountValue: 20, // 20% or 20 NGN
  startDate: new Date("2024-11-29T00:00:00"),
  endDate: new Date("2024-11-30T23:59:59"),
  requiredMinimumProducts: 1,
  featured: true
};

await promoCampaignService.createCampaign(campaignData);
```

#### 2. Access Campaign Manager

The campaign manager is available in the Admin Dashboard:

1. Navigate to Admin Dashboard
2. Go to "Promotions" or "Campaigns" tab
3. Click "Create Campaign"
4. Fill in campaign details
5. Choose participation type
6. Activate campaign

#### 3. Monitor Vendor Compliance

1. Click "Compliance" button on any campaign
2. View:
   - Total vendors
   - Participating vendors
   - Non-participating vendors
   - Compliance rate percentage
3. Send reminders to non-participating vendors

#### 4. Vendor Compliance Workflow

**For Required Campaigns:**
- Vendors are automatically enrolled
- Products automatically get discounted
- Vendors can see discounts applied
- Vendors cannot remove participation

**For Opt-In Campaigns:**
- Vendors receive invitation notifications
- Vendors click "Join Campaign"
- Vendors select products to discount
- Discounts are applied automatically
- Vendors can remove participation later

**For Invited Campaigns:**
- Only invited vendors receive notifications
- Same workflow as opt-in
- Other vendors cannot see the campaign

### For Vendors

#### 1. View Available Campaigns

1. Navigate to Vendor Dashboard
2. Go to "Promotions" or "Campaigns" tab
3. View all active campaigns you're eligible for

#### 2. Join a Campaign (Opt-In)

1. Click "Join Campaign" on a campaign card
2. Select products to include (minimum required)
3. Preview discounts that will be applied
4. Click "Apply Discount"
5. Products are automatically updated with promotional pricing

#### 3. View Participating Products

- See all your products in active campaigns
- View original price vs. discounted price
- See discount amount
- Track product performance during campaigns

#### 4. Remove Participation (Opt-In Only)

1. Click "Remove" on campaign card
2. Confirm removal
3. Products revert to original prices
4. Campaign is removed from your active list

## Data Structure

### Campaign Document (Firestore: `promoCampaigns`)

```javascript
{
  id: "campaign_id",
  name: "Black Friday 2024",
  description: "Biggest sale of the year",
  type: "black_friday",
  status: "active", // draft, active, paused, completed, cancelled
  participationType: "required", // required, opt_in, invited
  discountType: "percentage", // percentage, fixed
  discountValue: 20, // 20% or 20 NGN
  minDiscount: 0,
  maxDiscount: 100,
  startDate: Timestamp,
  endDate: Timestamp,
  categories: [], // Specific categories (empty = all)
  invitedVendors: [], // For invited participation
  requiredMinimumProducts: 1,
  participationCount: 0, // Number of participating vendors
  totalProducts: 0, // Total products in campaign
  totalDiscountValue: 0, // Total discount value
  bannerImage: "",
  bannerText: "",
  featured: false,
  createdBy: "admin_user_id",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Vendor Participation Document (Firestore: `promoCampaignParticipations`)

```javascript
{
  id: "participation_id",
  campaignId: "campaign_id",
  vendorId: "vendor_id",
  status: "active", // active, removed
  productsCount: 5, // Number of products added
  totalDiscount: 0, // Total discount value
  optedInAt: Timestamp,
  autoJoined: false // True if required participation
}
```

### Product Document Updates

When a product is added to a campaign:

```javascript
{
  // Existing product fields...
  originalPrice: 10000, // Original price stored
  price: 8000, // Discounted price
  promoCampaigns: {
    "campaign_id": {
      discountType: "percentage",
      discountValue: 20,
      discountAmount: 2000,
      appliedAt: Timestamp
    }
  },
  onSale: true
}
```

## Integration Points

### 1. Admin Dashboard

Add to `apps/buyer/src/pages/Admin.jsx`:

```javascript
import PromoCampaignManager from '../components/admin/PromoCampaignManager';

// In Admin component, add new tab:
{activeTab === 'promotions' && (
  <PromoCampaignManager />
)}
```

### 2. Vendor Dashboard

Add to `apps/buyer/src/pages/Vendor.jsx`:

```javascript
import VendorPromoCampaigns from '../components/vendor/VendorPromoCampaigns';

// In Vendor component, add new tab:
{activeTab === 'promotions' && (
  <VendorPromoCampaigns />
)}
```

### 3. Product Display

Products automatically show:
- Original price (crossed out)
- Discounted price (highlighted)
- Discount badge (e.g., "-20%")
- "On Sale" indicator

### 4. Pricing Service Integration

The pricing service automatically calculates discounts:

```javascript
// In pricingService.js
const calculatePricingBreakdown = (cartItems, deliveryOption, selectedLogistics) => {
  // ... existing code ...
  
  // Apply campaign discounts
  let totalDiscount = 0;
  cartItems.forEach(item => {
    if (item.promoCampaigns) {
      // Calculate discount from active campaigns
      Object.values(item.promoCampaigns).forEach(campaign => {
        totalDiscount += campaign.discountAmount || 0;
      });
    }
  });
  
  const total = subtotal + vatAmount + serviceFeeAmount + logisticsFee - totalDiscount;
  // ...
}
```

## Compliance Enforcement

### Automatic Enforcement (Required Campaigns)

1. When campaign is activated:
   - All approved vendors are automatically enrolled
   - Vendors receive notifications
   - System tracks participation status

2. Vendor compliance tracking:
   - Monitors which vendors have joined
   - Tracks number of products added
   - Calculates compliance rate

3. Reminders:
   - Admin can send reminder notifications
   - Non-participating vendors get follow-ups
   - Compliance dashboard shows status

### Manual Enforcement (Opt-In)

1. Vendors receive invitation notifications
2. Vendors must manually join and select products
3. Admin can monitor participation rates
4. Admin can send reminders to encourage participation

## Best Practices

### For Administrators

1. **Campaign Planning**
   - Set clear start/end dates
   - Choose appropriate participation type
   - Set realistic discount values
   - Define minimum product requirements

2. **Vendor Communication**
   - Send advance notifications (1-2 weeks before)
   - Provide clear instructions
   - Set expectations for required campaigns
   - Monitor compliance regularly

3. **Campaign Management**
   - Activate campaigns at least 1 week in advance
   - Monitor vendor participation daily
   - Send reminders to non-participating vendors
   - Track campaign performance

### For Vendors

1. **Product Selection**
   - Choose products with good margins
   - Ensure sufficient stock
   - Select popular products for maximum impact
   - Meet minimum product requirements

2. **Price Management**
   - Review original vs. discounted prices
   - Ensure discounts don't hurt profitability
   - Monitor competitor pricing
   - Adjust inventory as needed

3. **Campaign Participation**
   - Join campaigns early
   - Add maximum allowed products
   - Monitor performance during campaigns
   - Respond to customer inquiries quickly

## Notification System

Vendors receive notifications for:
- Campaign invitations (opt-in/invited)
- Campaign start (required)
- Campaign reminders (non-participating)
- Campaign end (upcoming)

## Security & Permissions

- Only admins can create/edit campaigns
- Vendors can only manage their own participation
- System validates participation eligibility
- Discount calculations are server-side validated

## Future Enhancements

1. **Analytics Dashboard**
   - Campaign performance metrics
   - Vendor participation analytics
   - Sales impact tracking
   - ROI calculations

2. **Advanced Features**
   - Tiered discounts (more products = bigger discount)
   - Category-specific campaigns
   - Geographic targeting
   - Time-limited flash sales

3. **Automation**
   - Auto-apply discounts at campaign start
   - Auto-remove discounts at campaign end
   - Automatic compliance reminders
   - Performance-based vendor rewards

## Support

For questions or issues:
- Check admin dashboard for campaign status
- Review vendor notifications
- Contact support for campaign-related queries
