// Migration stub: original file contained many Firebase-dependent functions.
// This trimmed file retains helpers and provides placeholders for backend migration.

const axios = require('axios');
const crypto = require('crypto');

// TODO: Replace secret management with secure environment/config management on Render.
const getPaystackConfig = () => ({
  secretKey:
    process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SK || process.env.SK_TEST_PAYSTACK || null,
  webhookSecret:
    process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_HASH || null,
});

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const paystackAxios = axios.create({ baseURL: PAYSTACK_BASE_URL, timeout: 20000 });

const PAYOUT_REQUESTS_COLLECTION = 'payout_requests';
const PAYOUT_RECIPIENTS_COLLECTION = 'payout_recipients';
const VAT_LEDGER_COLLECTION = 'vat_ledger';

const callPaystack = async ({ method = 'post', endpoint, data }) => {
  if (!endpoint) throw new Error('Paystack endpoint is required');
  const { secretKey } = getPaystackConfig();
  if (!secretKey) throw new Error('Paystack secret key not configured');
  const headers = { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' };
  const response = await paystackAxios.request({ method, url: endpoint, data, headers });
  return response?.data?.data;
};

// Subscription plans
const VENDOR_SUBSCRIPTION_PLANS = {
  basic: { price: 0, commissionRate: 5.0, productLimit: 10, annualPrice: 0, analyticsLevel: 'basic' },
  pro: { price: 5000, annualPrice: 50000, commissionRate: 3.0, productLimit: 20, analyticsLevel: 'advanced' },
  premium: { price: 15000, annualPrice: 150000, commissionRate: 2.0, productLimit: 100, analyticsLevel: 'premium' },
};

const MONTHLY_SUBSCRIPTION_DURATION_DAYS = 30;
const ANNUAL_SUBSCRIPTION_DURATION_DAYS = 365;
const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const normalizePlanKey = (plan) => (typeof plan === 'string' ? plan.trim().toLowerCase() : '');
const normalizeBillingCycle = (cycle) => (typeof cycle === 'string' && cycle.trim().toLowerCase() === 'annual' ? 'annual' : 'monthly');
const getSubscriptionTermDays = (cycle) => (cycle === 'annual' ? ANNUAL_SUBSCRIPTION_DURATION_DAYS : MONTHLY_SUBSCRIPTION_DURATION_DAYS);
const getPlanPrice = (planConfig, cycle) => (cycle === 'annual' ? Number(planConfig.annualPrice ?? planConfig.price * 12) : Number(planConfig.price));

const parsePaystackMetadata = (metadata) => {
  if (!metadata) return {};
  if (typeof metadata === 'object') return metadata;
  try { return JSON.parse(metadata); } catch (e) { return {}; }
};

const allowedOrigins = new Set([
  'https://ojawa-ecommerce.web.app',
  'https://ojawa-ecommerce.firebaseapp.com',
  'https://ojawa-ecommerce-staging.web.app',
  'https://ojawa-ecommerce-staging.firebaseapp.com',
  'https://ojawa.africa',
  'https://www.ojawa.africa',
]);
const isLocalhostOrigin = (origin = '') => origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
const isOriginAllowed = (origin = '') => { if (!origin) return true; if (isLocalhostOrigin(origin)) return true; return allowedOrigins.has(origin); };

const addCorsHeaders = (res, origin = '') => {
  if (origin) { res.set('Access-Control-Allow-Origin', origin); res.set('Vary', 'Origin'); }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Credentials', 'true');
};

// Migration placeholders: these functions previously used Firestore/admin SDK.
// Replace each with calls to your Render backend REST API or your chosen DB service.

exports.handlePayoutRequestCreated = async (event) => {
  throw new Error('handlePayoutRequestCreated removed: migrate to backend REST endpoint (see functions/index.js TODO)');
};

exports.processPayoutRequest = async (request) => {
  throw new Error('processPayoutRequest removed: migrate to backend REST endpoint (see functions/index.js TODO)');
};

exports.ensureWalletForUser = async (request) => {
  throw new Error('ensureWalletForUser removed: migrate to backend REST endpoint (see functions/index.js TODO)');
};

exports.ensurePaystackRecipient = async (opts) => {
  throw new Error('ensurePaystackRecipient not implemented: migrate to backend DB/REST API');
};

exports.createWalletAutoWithdrawal = async (opts) => {
  throw new Error('createWalletAutoWithdrawal not implemented: migrate to backend DB/REST API');
};

exports.revertWalletAutoWithdrawal = async (opts) => {
  throw new Error('revertWalletAutoWithdrawal not implemented: migrate to backend DB/REST API');
};

exports.getWalletDocByUserId = async (userId) => {
  throw new Error('getWalletDocByUserId not implemented: migrate to backend DB/REST API');
};

exports.upsertVatLedgerEntry = async (opts) => {
  throw new Error('upsertVatLedgerEntry not implemented: migrate to backend DB/REST API');
};

exports.ensureWalletDocument = async (opts) => {
  throw new Error('ensureWalletDocument not implemented: migrate to backend DB/REST API');
};

exports.resolveStakeholderAccountDetails = async (stakeholder = {}) => {
  throw new Error('resolveStakeholderAccountDetails not implemented: migrate to backend DB/REST API');
};

exports.processPayoutRequestDocument = async ({ payoutRequestId, data }) => {
  throw new Error('processPayoutRequestDocument removed: migrate to backend REST endpoint (see functions/index.js TODO)');
};

exports.processPaystackWalletTopup = async ({ reference, userId, amount }, authUid) => {
  throw new Error('processPaystackWalletTopup removed: migrate to backend REST endpoint (see functions/index.js TODO)');
};

exports.applyVendorSubscription = async (opts) => {
  throw new Error('applyVendorSubscription removed: migrate to backend REST endpoint (see functions/index.js TODO)');
};

// Notification placeholder
exports.notifyVendorNewOrder = async (req, res) => {
  res.status(500).json({ error: 'notifyVendorNewOrder removed: migrate to backend notifications service' });
};

// Export helpers for other modules
module.exports.helpers = {
  callPaystack,
  addDays,
  normalizePlanKey,
  normalizeBillingCycle,
  getSubscriptionTermDays,
  getPlanPrice,
  parsePaystackMetadata,
  isOriginAllowed,
  addCorsHeaders,
};
