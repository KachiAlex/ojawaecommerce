require('dotenv').config();
// Firebase removed: migration now uses REST backend

const shouldApply = process.argv.includes('--apply');
const useEmulator = process.argv.includes('--use-emulator');

if (!useEmulator && process.env.FIRESTORE_EMULATOR_HOST) {
  console.warn(
    `Ignoring FIRESTORE_EMULATOR_HOST=${process.env.FIRESTORE_EMULATOR_HOST} for migration run. ` +
    'Pass --use-emulator to target emulator explicitly.'
  );
  delete process.env.FIRESTORE_EMULATOR_HOST;
}

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || 'ojawa-ecommerce';
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : null;

if (!admin.apps.length) {
  if (firebaseClientEmail && firebasePrivateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseProjectId,
        clientEmail: firebaseClientEmail,
        privateKey: firebasePrivateKey,
      }),
      projectId: firebaseProjectId,
    });
  } else {
    admin.initializeApp({ projectId: firebaseProjectId });
  }
}

const db = admin.firestore();
// Use REST transport for one-off scripts to avoid local gRPC/proxy issues.
db.settings({ preferRest: true });

const PLAN_CONFIGS = {
  basic: {
    price: 0,
    annualPrice: 0,
    commissionRate: 5.0,
    productLimit: 10,
    analyticsLevel: 'basic',
    supportLevel: 'email',
    mediaPerProduct: 6,
    videoUploads: false,
    bulkTools: false,
    storefrontThemes: 'standard',
    payoutSchedule: 'weekly',
  },
  pro: {
    price: 5000,
    annualPrice: 50000,
    commissionRate: 3.0,
    productLimit: 20,
    analyticsLevel: 'advanced',
    supportLevel: 'priority',
    mediaPerProduct: 15,
    videoUploads: true,
    bulkTools: true,
    storefrontThemes: 'enhanced',
    payoutSchedule: 'twice-weekly',
  },
  premium: {
    price: 15000,
    annualPrice: 150000,
    commissionRate: 2.0,
    productLimit: 100,
    analyticsLevel: 'premium',
    supportLevel: 'dedicated',
    mediaPerProduct: 30,
    videoUploads: true,
    bulkTools: true,
    storefrontThemes: 'custom',
    payoutSchedule: 'daily',
  },
};

const normalizePlan = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
const normalizeBillingCycle = (value) => (typeof value === 'string' && value.trim().toLowerCase() === 'annual' ? 'annual' : 'monthly');
const getTermDays = (cycle) => (cycle === 'annual' ? 365 : 30);
const getPrice = (planConfig, cycle) => (cycle === 'annual' ? planConfig.annualPrice : planConfig.price);

const buildPlanPatch = ({ planKey, billingCycle, source }) => {
  const plan = PLAN_CONFIGS[planKey];
  if (!plan) {
    return null;
  }

  const patch = {
    billingCycle,
    subscriptionTermDays: getTermDays(billingCycle),
    commissionRate: plan.commissionRate,
    productLimit: plan.productLimit,
    analyticsLevel: plan.analyticsLevel,
    supportLevel: plan.supportLevel,
    mediaPerProduct: plan.mediaPerProduct,
    videoUploads: plan.videoUploads,
    bulkTools: plan.bulkTools,
    storefrontThemes: plan.storefrontThemes,
    payoutSchedule: plan.payoutSchedule,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (source === 'subscriptions') {
    patch.price = getPrice(plan, billingCycle);
  }

  return patch;
};

const getChangedFields = (docData, patch) => {
  const changed = {};
  Object.entries(patch).forEach(([key, value]) => {
    if (key === 'updatedAt') {
      return;
    }
    if (docData[key] !== value) {
      changed[key] = value;
    }
  });
  return changed;
};

async function collectPlanDocuments(collectionName, planField) {
  const plans = Object.keys(PLAN_CONFIGS);
  const snapshots = await Promise.all(
    plans.map((plan) => db.collection(collectionName).where(planField, '==', plan).get())
  );

  const unique = new Map();
  snapshots.forEach((snapshot) => {
    snapshot.docs.forEach((docSnap) => {
      unique.set(docSnap.id, docSnap);
    });
  });
  return Array.from(unique.values());
}

async function migrateCollection({ collectionName, planField }) {
  const docs = await collectPlanDocuments(collectionName, planField);

  const pendingUpdates = [];
  for (const docSnap of docs) {
    const data = docSnap.data() || {};
    const planKey = normalizePlan(data[planField]);
    const billingCycle = normalizeBillingCycle(data.billingCycle);
    const patch = buildPlanPatch({
      planKey,
      billingCycle,
      source: collectionName,
    });

    if (!patch) {
      continue;
    }

    const changed = getChangedFields(data, patch);
    if (Object.keys(changed).length > 0) {
      pendingUpdates.push({
        ref: docSnap.ref,
        fields: { ...changed, updatedAt: patch.updatedAt },
      });
    }
  }

  return pendingUpdates;
}

async function applyInBatches(updates) {
  const chunkSize = 400;
  let applied = 0;

  for (let i = 0; i < updates.length; i += chunkSize) {
    const batch = db.batch();
    const chunk = updates.slice(i, i + chunkSize);

    chunk.forEach(({ ref, fields }) => {
      batch.set(ref, fields, { merge: true });
    });

    await batch.commit();
    applied += chunk.length;
  }

  return applied;
}

async function run() {
  console.log(`Running subscription migration in ${shouldApply ? 'APPLY' : 'DRY-RUN'} mode`);

  const [userUpdates, subscriptionUpdates] = await Promise.all([
    migrateCollection({ collectionName: 'users', planField: 'subscriptionPlan' }),
    migrateCollection({ collectionName: 'subscriptions', planField: 'plan' }),
  ]);

  const total = userUpdates.length + subscriptionUpdates.length;

  console.log(`Users to update: ${userUpdates.length}`);
  console.log(`Subscriptions to update: ${subscriptionUpdates.length}`);
  console.log(`Total documents needing update: ${total}`);

  if (!shouldApply) {
    console.log('Dry-run complete. Re-run with --apply to persist changes.');
    return;
  }

  const appliedUsers = await applyInBatches(userUpdates);
  const appliedSubscriptions = await applyInBatches(subscriptionUpdates);

  console.log(`Applied updates to users: ${appliedUsers}`);
  console.log(`Applied updates to subscriptions: ${appliedSubscriptions}`);
  console.log('Migration complete.');
}

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
