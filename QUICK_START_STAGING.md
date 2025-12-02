# Quick Start: Staging Environment

## ✅ What's Been Set Up

1. **Firebase Configuration**: Updated `firebase.json` to support both production and staging
2. **Firebase Targets**: Updated `.firebaserc` with staging target configuration
3. **Deployment Scripts**: Added npm scripts to `package.json` for easy deployment

## 🚀 Next Steps (One-Time Setup)

### 1. Create the Staging Site in Firebase Console

1. Go to https://console.firebase.google.com/
2. Select your project: **ojawa-ecommerce**
3. Navigate to **Hosting** in the left sidebar
4. Click **"Add another site"** (or the **+** button)
5. Enter site ID: `ojawa-ecommerce-staging`
6. Click **"Continue"**

### 2. Connect the Target

Run this command once:

```bash
firebase target:apply hosting ojawa-ecommerce-staging ojawa-ecommerce-staging
```

## 📦 Deployment Commands

From the **root directory**, use these simple commands:

```bash
# Deploy to staging (your test environment)
npm run deploy:staging

# Deploy to production (live site)
npm run deploy:prod

# Deploy to a preview channel (temporary URL)
npm run deploy:preview
```

That's it! The scripts will:
1. Build your app automatically
2. Deploy to the correct environment

## 🔗 Your URLs

After first deployment:
- **Staging**: https://ojawa-ecommerce-staging.web.app
- **Production**: https://ojawa-ecommerce.web.app

## 💡 Workflow Recommendation

1. Make changes locally
2. Test locally: `cd apps/buyer && npm run dev`
3. Deploy to staging: `npm run deploy:staging`
4. Test on staging URL
5. If all good, deploy to production: `npm run deploy:prod`

## 📖 Full Documentation

See `STAGING_DEPLOYMENT_GUIDE.md` for detailed information.

