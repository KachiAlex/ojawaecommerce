# Google Maps API Setup for Enhanced Logistics

## Overview
The enhanced logistics system uses Google Maps APIs to:
- Calculate accurate distances between buyer and vendor
- Validate and geocode addresses
- Provide real-time route information

## Required APIs
1. **Google Maps Geocoding API** - For address validation and coordinates
2. **Google Maps Distance Matrix API** - For distance calculation

## Setup Steps

### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the following APIs:
   - Maps JavaScript API
   - Geocoding API
   - Distance Matrix API
   - Places API (optional, for address autocomplete)

4. Create API credentials:
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Copy the API key

5. Restrict your API key (recommended):
   - Application restrictions: HTTP referrers
   - Add your domains: `https://ojawa-ecommerce.web.app`, `http://localhost:5173`
   - API restrictions: Select only the APIs you need

### 2. Add API Key to Environment

Create or update `.env` file in `apps/buyer/`:

```bash
VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```

### 3. Update Firebase Environment Config (for production)

```bash
firebase functions:config:set google.maps_api_key="YOUR_API_KEY"
```

## Testing the Integration

### Test Address Format:
```javascript
{
  street: "15 Marina Street",
  city: "Lagos Island",
  state: "Lagos",
  country: "Nigeria"
}
```

### Expected Behavior:
1. User enters complete address (street, city, state)
2. System geocodes the address
3. Calculates distance using Distance Matrix API
4. Categorizes route (intracity/intercity/international)
5. Queries matching logistics partners
6. Displays pricing from partners

## Firestore Data Structure

### Logistics Routes Collection: `logistics_routes`

```javascript
{
  companyId: "logistics_profile_id",
  companyName: "Fast Delivery Co",
  routeType: "intracity", // or "intercity" or "international"
  ratePerKm: 500,
  
  // For intracity
  serviceAreas: ["Lagos Island", "Victoria Island", "Lekki"],
  
  // For intercity
  from: "Lagos",
  to: "Abuja",
  suggestedPrice: 15000,
  
  // For international
  fromCountry: "Nigeria",
  toCountry: "Ghana",
  
  vehicleType: "Van",
  rating: 4.5,
  estimatedDays: "2-3",
  active: true,
  createdAt: timestamp
}
```

## Cost Estimates

Google Maps API Pricing (as of 2024):
- Geocoding API: $5 per 1000 requests
- Distance Matrix API: $5-10 per 1000 requests (depending on traffic data)
- Free tier: $200 credit per month

**Recommendation:** Implement caching for frequently queried routes to minimize API costs.

## Fallback Behavior

If Google Maps API key is not configured:
- System will use platform default pricing
- Distance will be estimated based on city/state differences
- Route categorization will still work based on address comparison
- No real-time distance calculation

## Security Notes

⚠️ **Important:**
- Never commit API keys to version control
- Use environment variables
- Restrict API key to specific domains
- Monitor API usage in Google Cloud Console
- Set up billing alerts

## Support

For issues with Google Maps integration:
1. Check API key is correctly set in `.env`
2. Verify APIs are enabled in Google Cloud Console
3. Check browser console for API errors
4. Verify domain restrictions allow your testing domain

