# Setting Flutterwave Environment Variables

## Step 1: Get Your Flutterwave Keys

1. **Login to Flutterwave Dashboard**
   - Go to: https://dashboard.flutterwave.com/
   - Login with your account

2. **Navigate to API Keys**
   - Click **Settings** (gear icon) in the sidebar
   - Click **API Keys** or go to: https://dashboard.flutterwave.com/settings/developers

3. **Copy Your Keys**
   - **Secret Key**: Copy the secret key (starts with `FLWSECK_TEST-` for test mode or `FLWSECK-` for live mode)
   - **Secret Hash**: Copy the secret hash (used for webhook verification)

## Step 2: Set Environment Variables

Once you have your keys, run these commands:

```bash
# Set Flutterwave Secret Key
firebase functions:config:set flutterwave.secret_key="YOUR_SECRET_KEY_HERE"

# Set Flutterwave Secret Hash (optional but recommended)
firebase functions:config:set flutterwave.secret_hash="YOUR_SECRET_HASH_HERE"

# Verify the config was set
firebase functions:config:get
```

## Step 3: Deploy Functions

After setting the config, deploy the functions:

```bash
firebase deploy --only functions
```

---

**Note**: Replace `YOUR_SECRET_KEY_HERE` and `YOUR_SECRET_HASH_HERE` with your actual keys from Flutterwave dashboard.

