# Vercel Backend Deployment Guide

## Backend Migration to Vercel: ojawa-green.vercel.app

### Changes Made

1. **Vercel Configuration** (`vercel.json`)
   - Configured for @vercel/node runtime
   - Routes all requests to server.js

2. **Server Adaptation** (`server.js`)
   - Exported app as module for Vercel serverless
   - Conditionally start server only when not on Vercel
   - Removed graceful shutdown handlers for serverless environment

3. **Environment Variables** (`.env.vercel`)
   - Created reference file for Vercel environment variables
   - Includes Firebase, CORS, JWT, and payment gateway configs

4. **Frontend API URL Update**
   - Updated `apps/buyer/.env.production` to point to `https://ojawa-green.vercel.app`
   - Updated `apps/buyer/.env.example` to point to `https://ojawa-green.vercel.app`

### Deployment Steps

#### 1. Push Changes to Repository
```bash
git add services/render-backend/vercel.json
git add services/render-backend/server.js
git add services/render-backend/.env.vercel
git add apps/buyer/.env.production
git add apps/buyer/.env.example
git commit -m "Migrate backend from Render to Vercel"
git push
```

#### 2. Use Existing Vercel Project
1. Go to [vercel.com](https://vercel.com)
2. Navigate to your existing project: `ojawa-green` (at ojawa-green.vercel.app)
3. Go to Project Settings → General
4. Update root directory to: `services/render-backend`
5. Ensure the framework preset is set to "Other" or "Node.js"

#### 3. Configure Environment Variables in Vercel
In your Vercel project dashboard, add these environment variables:

**Required:**
- `FIREBASE_PROJECT_ID` = `ojawa-ecommerce`
- `FIREBASE_CLIENT_EMAIL` = (your service account email)
- `FIREBASE_PRIVATE_KEY` = (your service account private key)
- `FIREBASE_DATABASE_URL` = (your Firebase database URL)
- `FIREBASE_API_KEY` = (your Firebase API key)

**CORS:**
- `ALLOWED_ORIGINS` = `https://ojawa.africa,https://www.ojawa.africa,https://ojawa-ecommerce.web.app,https://ojawa-ecommerce-staging.web.app,http://localhost:3000,http://localhost:5173`

**Other:**
- `JWT_SECRET` = (generate a secure random string)
- `PAYSTACK_SECRET_KEY` = (your Paystack secret key)
- `PAYSTACK_PUBLIC_KEY` = (your Paystack public key)
- `GOOGLE_MAPS_API_KEY` = (your Google Maps API key)
- `NODE_ENV` = `production`

#### 4. Deploy
Click "Deploy" in Vercel. The backend will be deployed at `https://ojawa-green.vercel.app`

#### 5. Test the Deployment
```bash
# Test health endpoint
curl https://ojawa-green.vercel.app/health

# Test products endpoint
curl https://ojawa-green.vercel.app/api/products
```

#### 6. Update CORS on Vercel
The CORS configuration is already in the code (server.js lines 59-93), but ensure the `ALLOWED_ORIGINS` environment variable is set correctly in Vercel.

### Frontend Deployment
After the backend is deployed, redeploy the frontend to pick up the new API URL:
```bash
cd apps/buyer
npm run build
# Deploy to your hosting (Firebase/Vercel/Netlify)
```

### Verification Checklist
- [ ] Backend deployed at `https://ojawa-green.vercel.app`
- [ ] Health endpoint returns 200 OK
- [ ] Products endpoint returns data
- [ ] CORS headers present for `https://ojawa.africa`
- [ ] Frontend can fetch products from new backend
- [ ] Products display on `https://ojawa.africa`

### Rollback Plan
If issues occur:
1. Revert the frontend `.env.production` to point back to Render
2. Redeploy frontend
3. Debug Vercel backend logs in Vercel dashboard
