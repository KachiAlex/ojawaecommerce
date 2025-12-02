# Flutterwave Webhook Setup Guide

This guide explains how to configure Flutterwave webhooks for your Ojawa e-commerce application.

## 📋 Overview

The Flutterwave webhook handler has been implemented to automatically process payment events. This ensures that:
- ✅ Wallet top-ups are processed even if the user closes the browser
- ✅ Order payments are confirmed automatically
- ✅ Payment failures are tracked and users are notified
- ✅ All transactions are verified server-side for security

## 🔗 Webhook URL

After deploying your Firebase Functions, your webhook URL will be:

```
https://us-central1-ojawa-ecommerce.cloudfunctions.net/flutterwaveWebhook
```

**For staging/testing:**
```
https://us-central1-ojawa-ecommerce.cloudfunctions.net/flutterwaveWebhook
```

## 🚀 Setup Steps

### Step 1: Deploy Firebase Functions

First, deploy the webhook handler function:

```bash
# Navigate to project root
cd /path/to/ojawaecommerce-main

# Deploy functions
firebase deploy --only functions
```

### Step 2: Set Environment Variables

Set the Flutterwave secret key and secret hash in Firebase Functions:

```bash
# Set Flutterwave secret key (required)
firebase functions:config:set flutterwave.secret_key="YOUR_FLUTTERWAVE_SECRET_KEY"

# Set Flutterwave secret hash (optional but recommended for security)
firebase functions:config:set flutterwave.secret_hash="YOUR_FLUTTERWAVE_SECRET_HASH"

# Redeploy functions to apply changes
firebase deploy --only functions
```

**Note:** For Firebase Functions v2, use environment variables instead:

```bash
# Set environment variables (Firebase Functions v2)
firebase functions:secrets:set FLUTTERWAVE_SECRET_KEY
firebase functions:secrets:set FLUTTERWAVE_SECRET_HASH
```

### Step 3: Get Your Flutterwave Keys

1. **Login to Flutterwave Dashboard**
   - Go to: https://dashboard.flutterwave.com/
   - Login with your account

2. **Get Secret Key**
   - Navigate to **Settings** → **API Keys**
   - Copy your **Secret Key** (starts with `FLWSECK_TEST-` for test mode or `FLWSECK-` for live mode)
   - ⚠️ **Never share this key publicly!**

3. **Get Secret Hash (Optional but Recommended)**
   - In the same **Settings** → **API Keys** page
   - Find **Secret Hash** (used for webhook signature verification)
   - Copy the hash value

### Step 4: Configure Webhook in Flutterwave Dashboard

1. **Navigate to Webhooks**
   - Go to: https://dashboard.flutterwave.com/settings/webhooks
   - Or: **Settings** → **Webhooks**

2. **Add New Webhook**
   - Click **Add Webhook** or **Create Webhook**
   - Enter the following:

   **Webhook URL:**
   ```
   https://us-central1-ojawa-ecommerce.cloudfunctions.net/flutterwaveWebhook
   ```

   **Events to Listen For:**
   - ✅ `charge.completed`
   - ✅ `charge.successful`
   - ✅ `charge.failed`

3. **Save Webhook**
   - Click **Save** or **Create Webhook**
   - Flutterwave will send a test webhook to verify the URL

### Step 5: Test the Webhook

1. **Make a Test Payment**
   - Use Flutterwave test cards to make a payment
   - Check Firebase Functions logs:
     ```bash
     firebase functions:log --only flutterwaveWebhook
     ```

2. **Verify Processing**
   - Check Firestore for:
     - Wallet transactions (`wallet_transactions` collection)
     - Order updates (`orders` collection)
     - Notifications (`notifications` collection)

## 🔒 Security Features

The webhook handler includes:

1. **Signature Verification**
   - Verifies webhook signature using `FLUTTERWAVE_SECRET_HASH`
   - Rejects requests with invalid signatures

2. **Transaction Verification**
   - Verifies each transaction with Flutterwave API
   - Ensures transaction status and amount match

3. **Duplicate Prevention**
   - Checks if transaction was already processed
   - Prevents double-crediting wallets

4. **Error Handling**
   - Logs all errors for debugging
   - Returns appropriate HTTP status codes

## 📊 Webhook Events Handled

### 1. `charge.completed` / `charge.successful`

**What happens:**
- Transaction is verified with Flutterwave API
- Wallet is credited (for wallet top-ups)
- Order payment status is updated (for orders)
- User receives notification
- Transaction record is created

**Metadata Expected:**
```json
{
  "purpose": "wallet_topup",
  "userId": "user123"
}
```

or

```json
{
  "orderId": "order123",
  "userId": "user123"
}
```

### 2. `charge.failed`

**What happens:**
- Payment failure is logged
- User receives failure notification
- Order payment status is updated (if applicable)

## 🧪 Testing

### Test with Flutterwave Test Cards

Use these test cards for testing:

**Successful Payment:**
- Card Number: `5531886652142950`
- CVV: `123`
- Expiry: `12/32`
- PIN: `1234`
- OTP: `123456`

**Failed Payment:**
- Card Number: `4084084084084081`
- CVV: `408`
- Expiry: `12/32`
- PIN: `4081`
- OTP: `123456`

### Monitor Webhook Logs

```bash
# View all webhook logs
firebase functions:log --only flutterwaveWebhook

# View recent logs
firebase functions:log --only flutterwaveWebhook --limit 50

# Follow logs in real-time
firebase functions:log --only flutterwaveWebhook --follow
```

## 🔍 Troubleshooting

### Issue: Webhook not receiving events

**Solutions:**
1. Verify webhook URL is correct in Flutterwave dashboard
2. Check Firebase Functions are deployed:
   ```bash
   firebase functions:list
   ```
3. Check webhook is active in Flutterwave dashboard
4. Test webhook URL manually:
   ```bash
   curl -X POST https://us-central1-ojawa-ecommerce.cloudfunctions.net/flutterwaveWebhook \
     -H "Content-Type: application/json" \
     -d '{"event":"test"}'
   ```

### Issue: "Invalid signature" error

**Solutions:**
1. Verify `FLUTTERWAVE_SECRET_HASH` is set correctly
2. Check secret hash matches in Flutterwave dashboard
3. Ensure webhook URL is correct

### Issue: Transactions not processing

**Solutions:**
1. Check Firebase Functions logs for errors
2. Verify `FLUTTERWAVE_SECRET_KEY` is set
3. Check transaction metadata includes required fields (`userId`, `purpose`, etc.)
4. Verify transaction status in Flutterwave dashboard

### Issue: Duplicate transactions

**Solutions:**
- The webhook handler automatically prevents duplicates
- If you see duplicates, check:
  1. Multiple webhook endpoints configured
  2. Webhook retries from Flutterwave
  3. Check `wallet_transactions` collection for existing records

## 📝 Environment Variables Summary

### Frontend (`.env` file)
```env
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-...
```

### Backend (Firebase Functions)
```bash
# Set via Firebase CLI
firebase functions:config:set flutterwave.secret_key="FLWSECK_TEST-..."
firebase functions:config:set flutterwave.secret_hash="your_secret_hash"
```

Or for Functions v2:
```bash
firebase functions:secrets:set FLUTTERWAVE_SECRET_KEY
firebase functions:secrets:set FLUTTERWAVE_SECRET_HASH
```

## ✅ Checklist

Before going live:

- [ ] Firebase Functions deployed
- [ ] `FLUTTERWAVE_SECRET_KEY` set in Functions config
- [ ] `FLUTTERWAVE_SECRET_HASH` set in Functions config (optional but recommended)
- [ ] Webhook URL configured in Flutterwave dashboard
- [ ] Test webhook events received successfully
- [ ] Wallet top-ups working via webhook
- [ ] Order payments processing correctly
- [ ] Error logs monitored
- [ ] Notifications being sent to users

## 🎯 Production Checklist

Before switching to live mode:

- [ ] Switch Flutterwave to **Live Mode**
- [ ] Update `FLUTTERWAVE_SECRET_KEY` with live secret key
- [ ] Update `FLUTTERWAVE_SECRET_HASH` with live secret hash
- [ ] Update webhook URL if needed (usually same URL)
- [ ] Test with small real transaction
- [ ] Monitor logs for first few transactions
- [ ] Verify all payment flows work correctly

## 📚 Additional Resources

- [Flutterwave Webhook Documentation](https://developer.flutterwave.com/docs/events)
- [Flutterwave API Reference](https://developer.flutterwave.com/reference)
- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)

## 🆘 Support

If you encounter issues:

1. Check Firebase Functions logs
2. Check Flutterwave dashboard webhook logs
3. Verify all environment variables are set
4. Test webhook URL manually
5. Contact Flutterwave support if webhook not being sent

---

**Last Updated**: December 2024  
**Status**: Ready for production use

