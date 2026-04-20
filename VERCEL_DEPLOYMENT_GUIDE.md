# Vercel Deployment Guide for Ojawa Backend

## Overview
This guide explains how to migrate the Ojawa e-commerce backend from Render to Vercel.

## Prerequisites
- Vercel account
- Node.js 18+ installed locally
- Git repository with the backend code

## Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

## Step 2: Login to Vercel
```bash
vercel login
```

## Step 3: Configure Environment Variables

### Required Environment Variables
Copy these to your Vercel project dashboard:

1. **Firebase Configuration**
   ```
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_CLIENT_EMAIL=your-service-account-email@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
   ```

2. **API Configuration**
   ```
   NODE_ENV=production
   API_BASE_URL=https://your-vercel-app.vercel.app
   ```

3. **Security**
   ```
   JWT_SECRET=your-jwt-secret-key
   ```

4. **Payment Processing** (if using)
   ```
   PAYSTACK_SECRET_KEY=your-paystack-secret-key
   FLUTTERWAVE_SECRET_KEY=your-flutterwave-secret-key
   ```

### Setup Instructions
1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add each variable with the correct value
4. Make sure to select the appropriate environments (Production, Preview, Development)

## Step 4: Deploy to Vercel

### Initial Deployment
```bash
# From the project root
vercel --prod
```

### Development Deployment
```bash
# For testing
vercel
```

## Step 5: Update Frontend Configuration

### Update API Base URL
In the frontend code, update the API base URL:

```javascript
// apps/buyer/src/services/api.js or similar
const API_BASE = 'https://your-vercel-app.vercel.app';
```

### Environment Variables
Update frontend environment variables:

```bash
# apps/buyer/.env.production
VITE_API_BASE=https://your-vercel-app.vercel.app
```

## Step 6: Test the Deployment

### Health Check
```bash
curl https://your-vercel-app.vercel.app/health
```

### API Endpoints Test
```bash
# Test authentication
curl -X POST https://your-vercel-app.vercel.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test products endpoint
curl https://your-vercel-app.vercel.app/api/products

# Test checkout endpoints
curl -X POST https://your-vercel-app.vercel.app/api/checkout/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"items":[],"shippingAddress":{},"paymentMethod":"escrow"}'
```

## File Structure for Vercel

```
ojawaecommerce-main/
  api/
    index.js                    # Vercel entry point
  functions/
    server.js                   # Main Express app
    package.json                # Backend dependencies
  vercel.json                  # Vercel configuration
  package.json                 # Root package.json with Vercel scripts
```

## Vercel Configuration Details

### vercel.json
- Configures routing to direct all requests to the Express app
- Sets up CORS headers
- Configures function timeout (30 seconds)

### api/index.js
- Serves as the Vercel function entry point
- Handles preflight OPTIONS requests
- Delegates to the Express app

## Migration Checklist

- [ ] Install Vercel CLI
- [ ] Login to Vercel
- [ ] Configure all environment variables
- [ ] Test local deployment
- [ ] Deploy to production
- [ ] Update frontend API URLs
- [ ] Test all API endpoints
- [ ] Verify checkout functionality
- [ ] Test authentication flow
- [ ] Update DNS if using custom domain

## Troubleshooting

### Common Issues

1. **Module Not Found Error**
   - Ensure all dependencies are in functions/package.json
   - Run `npm install` in the functions directory

2. **Environment Variables Not Working**
   - Check variable names match exactly
   - Ensure variables are set for the correct environment
   - Restart the deployment after adding variables

3. **CORS Issues**
   - Verify allowed origins in vercel.json
   - Check frontend is making requests to the correct URL

4. **Firebase Connection Issues**
   - Verify Firebase credentials are correct
   - Ensure service account has proper permissions
   - Check Firebase project ID matches

### Debugging

1. **Check Vercel Logs**
   ```bash
   vercel logs
   ```

2. **Local Testing**
   ```bash
   vercel dev
   ```

3. **Function Logs**
   - Go to Vercel dashboard > Functions > View Logs

## Post-Deployment

1. **Monitor Performance**
   - Check Vercel Analytics
   - Monitor function execution times
   - Set up alerts for errors

2. **Update Documentation**
   - Update API documentation with new URLs
   - Update deployment guides
   - Notify team of backend URL changes

3. **Backup Strategy**
   - Keep Render deployment active during transition
   - Test all functionality before switching DNS
   - Have rollback plan ready

## Support

For Vercel-specific issues:
- Vercel Documentation: https://vercel.com/docs
- Vercel Support: https://vercel.com/support

For application issues:
- Check application logs
- Review environment variables
- Test API endpoints individually
