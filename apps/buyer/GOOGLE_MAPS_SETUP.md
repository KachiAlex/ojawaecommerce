# Google Maps Integration Setup

## Overview
The Ojawa e-commerce platform now includes enhanced logistics features with Google Maps integration for:
- Accurate distance calculations
- Route optimization (intra-city vs inter-city)
- Dynamic pricing based on actual routes
- Location picker with autocomplete
- Route visualization

## Required Environment Variables

Add the following environment variable to your `.env` file:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

## Getting a Google Maps API Key

1. **Go to Google Cloud Console**
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Required APIs**
   - Go to "APIs & Services" > "Library"
   - Enable the following APIs:
     - Maps JavaScript API
     - Places API
     - Geocoding API
     - Directions API

3. **Create API Key**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key

4. **Secure Your API Key (Recommended)**
   - Click on your API key to configure it
   - Under "Application restrictions", select "HTTP referrers"
   - Add your domain(s): `https://your-domain.com/*`
   - Under "API restrictions", select "Restrict key"
   - Choose the APIs you enabled above

## Features Implemented

### 1. Enhanced Logistics Service
- **Route Analysis**: Automatically determines if a route is intra-city or inter-city
- **Dynamic Pricing**: Calculates costs based on actual distance and route type
- **Partner Selection**: Finds nearby logistics partners with optimized pricing

### 2. Google Maps Location Picker
- **Autocomplete**: Smart address suggestions as you type
- **Geocoding**: Converts addresses to coordinates
- **Validation**: Ensures valid addresses are selected

### 3. Route Visualization
- **Interactive Map**: Shows pickup and delivery locations
- **Route Display**: Visualizes the delivery route
- **Distance & Duration**: Shows estimated distance and delivery time

### 4. Enhanced Logistics Selector
- **Multiple Partners**: Shows all available logistics partners
- **Price Comparison**: Compares costs across different partners
- **Route Details**: Displays route type, distance, and estimated delivery time

## Route Types Supported

1. **Intra-city (Short)**: 0-10km within the same city
2. **Intra-city (Long)**: 10-30km within the same city
3. **Intra-city (Extended)**: 30km+ within the same city
4. **Inter-city**: Different cities, same state
5. **Inter-state**: Different states

## Pricing Structure

Each route type has optimized pricing:
- **Base Rate**: Fixed cost for the route type
- **Per-km Rate**: Variable cost based on distance
- **Weight Multiplier**: Additional cost for heavy items
- **Delivery Type**: Express, standard, economy options
- **Special Charges**: Fragile items, signature required, high-value insurance

## Usage in Checkout

The enhanced logistics selector is now integrated into the checkout process:

1. **Select Delivery Option**: Choose "Home Delivery"
2. **Enter Address**: Use the location picker for accurate addressing
3. **View Route**: See the delivery route on the map
4. **Compare Partners**: Review available logistics partners and pricing
5. **Select Partner**: Choose the best option for your needs

## Error Handling

The system includes fallback mechanisms:
- If Google Maps fails to load, falls back to basic address input
- If route calculation fails, uses estimated pricing
- If no logistics partners found, shows appropriate message

## Development Notes

- Google Maps service initializes lazily when first needed
- All map operations are asynchronous with proper error handling
- The system gracefully degrades if Maps API is unavailable
- Pricing calculations include both Maps-based and fallback methods

## Troubleshooting

### Common Issues

1. **"Maps service unavailable"**
   - Check if API key is correctly set in environment variables
   - Verify APIs are enabled in Google Cloud Console
   - Check browser console for specific error messages

2. **"Location not found"**
   - Try more specific addresses
   - Include city and state in the address
   - Check if the address exists in Google's database

3. **High API usage**
   - Consider implementing caching for repeated queries
   - Monitor usage in Google Cloud Console
   - Set up billing alerts

### Browser Console Errors

Check browser console for:
- API key validation errors
- CORS issues
- Network connectivity problems
- JavaScript errors in map initialization

## Security Considerations

1. **API Key Restrictions**: Always restrict your API key to specific domains
2. **Usage Limits**: Set up quotas and billing alerts
3. **CORS**: Ensure your domain is allowed in API restrictions
4. **Monitoring**: Monitor API usage for unusual patterns

## Future Enhancements

Potential improvements:
- Real-time traffic data integration
- Multiple route options (fastest vs cheapest)
- Driver tracking integration
- Estimated delivery time with traffic
- Route optimization for multiple deliveries
