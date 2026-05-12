# Staging Deployment Guide

This guide explains how to set up and use a separate staging/test environment for your Firebase app.

## Overview

You now have **two hosting environments**:
1. **Production** (`ojawa-ecommerce`) - Your live production site
2. **Staging** (`ojawa-ecommerce-staging`) - Your test environment (private, for testing)

## Initial Setup (One-Time)

### Step 1: Create the Staging Site in Firebase

First, you need to create a new hosting site in your Firebase project:

```bash
# Make sure you're logged into Firebase
firebase login

# Create the staging site in Firebase Console:
# 1. Go to https://console.firebase.google.com/
# 2. Select your project (ojawa-ecommerce)
# 3. Go to Hosting → Add another site
# 4. Create site: "ojawa-ecommerce-staging"
# 5. Click "Continue"

# Then connect the staging site target
firebase target:apply hosting ojawa-ecommerce-staging ojawa-ecommerce-staging
```

### Step 2: Verify Configuration

Your `firebase.json` now has both production and staging configurations. Your `.firebaserc` includes both targets.

## Deployment Commands

### Deploy to Production

```bash
# Build the app
cd apps/buyer
npm run build

# Deploy to production
cd ../..
firebase deploy --only hosting:ojawa-ecommerce
```

### Deploy to Staging (Test Environment)

```bash
# Build the app
cd apps/buyer
npm run build

# Deploy to staging
cd ../..
firebase deploy --only hosting:ojawa-ecommerce-staging
```

### Deploy Both (if needed)

```bash
cd apps/buyer
npm run build
cd ../..
firebase deploy --only hosting
```

## Quick Deploy Scripts

From the root directory, you can use these npm scripts:

```bash
# Deploy to production
npm run deploy:prod

# Deploy to staging
npm run deploy:staging
```

## Staging URL

Once deployed, your staging site will be available at:
- **https://ojawa-ecommerce-staging.web.app**
- **https://ojawa-ecommerce-staging.firebaseapp.com**

Your production site remains at:
- **https://ojawa-ecommerce.web.app**
- **https://ojawa-ecommerce.firebaseapp.com**

## Alternative: Preview Channels (Even Easier)

If you prefer temporary test URLs that expire, you can use Firebase Hosting Preview Channels:

```bash
# Build first
cd apps/buyer
npm run build

# Deploy to a preview channel (creates a unique URL)
cd ../..
firebase hosting:channel:deploy test-channel

# This creates a URL like:
# https://ojawa-ecommerce--test-channel-xyz123.web.app
```

Preview channels are great for:
- Quick testing before staging deployment
- Sharing test builds with specific people
- Temporary feature previews

## Best Practices

1. **Test on staging first**: Always deploy to staging and test before deploying to production
2. **Use staging URL**: Share the staging URL only with your team/testers
3. **Keep staging separate**: Use staging to test new features before they go live
4. **Firestore/Storage**: Both environments use the same Firestore database and Storage by default. If you need separate databases, you'll need to create a separate Firebase project.

## Troubleshooting

### Error: "Target 'ojawa-ecommerce-staging' not found"
- Make sure you've created the site in Firebase Console first
- Then run: `firebase target:apply hosting ojawa-ecommerce-staging ojawa-ecommerce-staging`

### Error: "Site does not exist"
- Go to Firebase Console → Hosting → Add another site
- Create the site: `ojawa-ecommerce-staging`
- Then run the target:apply command

## Quick Reference

| Action | Command |
|--------|---------|
| Deploy to Production | `npm run deploy:prod` or `firebase deploy --only hosting:ojawa-ecommerce` |
| Deploy to Staging | `npm run deploy:staging` or `firebase deploy --only hosting:ojawa-ecommerce-staging` |
| Preview Channel | `firebase hosting:channel:deploy test-channel` |
| View Sites | Firebase Console → Hosting |
