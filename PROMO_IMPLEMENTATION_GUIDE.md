# Promotional Campaign Implementation Guide

## Quick Start

### For Administrators

1. **Access Campaign Manager**
   - Go to Admin Dashboard
   - Click "Promotions" tab
   - Click "+ Create Campaign"

2. **Create Black Friday Campaign**
   ```
   Name: Black Friday 2024
   Type: Black Friday
   Participation: Required (all vendors must join)
   Discount: 20% off
   Start: November 29, 2024
   End: November 30, 2024
   ```

3. **Monitor Compliance**
   - View "Compliance" button on campaign card
   - See participation rate
   - Send reminders to non-participating vendors

### For Vendors

1. **View Campaigns**
   - Go to Vendor Dashboard
   - Click "Promotions" tab
   - See all active campaigns

2. **Join Campaign (Opt-In)**
   - Click "Join Campaign"
   - Select products to discount
   - Preview discount prices
   - Click "Apply Discount"

3. **Required Campaigns**
   - Automatically enrolled
   - Products automatically discounted
   - Cannot opt-out

## Three Participation Models

### 1. Required Participation
**Use Case:** Major platform-wide events (Black Friday, major holidays)

**How it works:**
- Admin creates campaign with `participationType: "required"`
- All approved vendors are automatically enrolled when campaign activates
- Products get discounts applied automatically
- Vendors cannot remove participation
- Best for: Ensuring platform-wide participation

**Implementation:**
```javascript
const campaign = {
  participationType: 'required',
  // ... other fields
};

// When activated, all vendors automatically enrolled
await promoCampaignService.notifyVendors(campaignId, 'required');
```

### 2. Opt-In Participation
**Use Case:** Optional promotions, vendor-driven campaigns

**How it works:**
- Admin creates campaign with `participationType: "opt_in"`
- Vendors receive invitation notifications
- Vendors choose to join and select products
- Vendors can remove participation later
- Best for: Optional sales, seasonal promotions

**Implementation:**
```javascript
const campaign = {
  participationType: 'opt_in',
  // ... other fields
};

// Vendors receive invitations
await promoCampaignService.notifyVendors(campaignId, 'invitation');
```

### 3. Invited Participation
**Use Case:** Exclusive promotions, vendor rewards

**How it works:**
- Admin creates campaign with `participationType: "invited"`
- Admin specifies list of vendor IDs
- Only invited vendors receive notifications
- Other vendors cannot see the campaign
- Best for: Exclusive deals, VIP vendors

**Implementation:**
```javascript
const campaign = {
  participationType: 'invited',
  invitedVendors: ['vendor1_id', 'vendor2_id'],
  // ... other fields
};
```

## Vendor Compliance Strategy

### For Required Campaigns

**Enforcement:**
1. **Automatic Enrollment**: When campaign activates, all approved vendors are automatically enrolled
2. **Notifications**: Vendors receive mandatory notification
3. **Product Auto-Discount**: System can automatically apply discounts (requires implementation)
4. **Tracking**: System tracks which vendors have products in the campaign

**Monitoring:**
- Admin dashboard shows compliance rate
- List of non-participating vendors
- Ability to send reminders
- Can see which vendors have added products

### For Opt-In Campaigns

**Encouragement:**
1. **Invitations**: Vendors receive attractive invitation notifications
2. **Benefits Highlighted**: Show potential sales boost
3. **Easy Joining**: One-click join with product selection
4. **Reminders**: Admin can send follow-up reminders

**Monitoring:**
- Track participation rate
- See which vendors joined
- Monitor product additions
- Send targeted reminders

## Technical Implementation

### Firestore Collections

1. **`promoCampaigns`**: Campaign definitions
2. **`promoCampaignParticipations`**: Vendor participation records
3. **Products updated**: `promoCampaigns` field added to product documents

### Key Functions

1. **Create Campaign**: `promoCampaignService.createCampaign()`
2. **Join Campaign**: `promoCampaignService.addVendorParticipation()`
3. **Apply Discount**: `promoCampaignService.applyCampaignToProduct()`
4. **Check Compliance**: `promoCampaignService.getVendorCompliance()`
5. **Notify Vendors**: `promoCampaignService.notifyVendors()`

## Workflow Example: Black Friday

1. **Admin creates campaign** (2 weeks before)
   - Sets as "required" participation
   - Configures 20% discount
   - Sets dates

2. **Campaign activates** (1 week before)
   - All vendors automatically enrolled
   - Notifications sent
   - Campaign appears in vendor dashboard

3. **Vendors add products** (automatically or manually)
   - Discounts applied
   - Products show sale prices
   - Original prices preserved

4. **During campaign**
   - Products show discounted prices
   - Customers see sale badges
   - Sales tracked

5. **After campaign ends**
   - Discounts automatically removed (or manual cleanup)
   - Products revert to original prices
   - Campaign marked as completed

## Compliance Best Practices

### 1. Communication
- **Advance Notice**: Notify vendors 1-2 weeks before
- **Clear Instructions**: Explain what's required
- **Benefits Highlighted**: Show potential sales boost

### 2. Monitoring
- **Daily Checks**: Monitor participation rates
- **Reminders**: Send to non-participating vendors
- **Follow-up**: Personal outreach if needed

### 3. Enforcement
- **Required Campaigns**: System enforces participation
- **Opt-In Campaigns**: Use incentives and reminders
- **Tracking**: Keep records of compliance

### 4. Support
- **Help Vendors**: Provide clear instructions
- **Troubleshoot**: Help with technical issues
- **Feedback**: Listen to vendor concerns

## Future Enhancements

1. **Auto-Apply Discounts**: Automatically apply to all vendor products (for required campaigns)
2. **Tiered Discounts**: More products = bigger discount
3. **Performance Tracking**: Track sales impact
4. **Automated Reminders**: System sends reminders automatically
5. **Vendor Incentives**: Reward compliant vendors
