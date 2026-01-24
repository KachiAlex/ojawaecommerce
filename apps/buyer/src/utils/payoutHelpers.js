const PLATFORM_PAYOUT_DEFAULT = {
  userId: 'rJNa6sUuQGVKJBD1CKjvANIIJhN2',
  walletId: '1tFMSBRmMTa0JRGWoQe1',
  role: 'platform',
};

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const pickAmount = (...candidates) => {
  for (const candidate of candidates) {
    const num = toNumber(candidate, NaN);
    if (Number.isFinite(num) && num !== 0) {
      return num;
    }
  }
  return 0;
};

export const normalizeTimestamp = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') return value;
  return null;
};

export const getPlatformPayoutConfig = () => ({ ...PLATFORM_PAYOUT_DEFAULT });

export const buildOrderStakeholders = (order = {}, overrides = {}) => {
  const pricing = order.pricingBreakdown || {};
  const breakdown = pricing.breakdown || {};
  const currency = order.currency || pricing.currency || 'NGN';

  const vendorAmount = toNumber(
    overrides.vendorAmount,
    pricing.subtotal,
    breakdown.subtotal?.amount,
    order.subtotal,
    order.totalAmount,
  );

  const logisticsAmount = toNumber(
    overrides.logisticsAmount,
    pricing.deliveryFee,
    breakdown.deliveryFee?.amount,
    order.deliveryFee,
    order.selectedLogistics?.deliveryFee,
    order.selectedLogistics?.cost,
  );

  const commissionAmount = pickAmount(
    overrides.commission,
    pricing.ojawaCommission,
    order.ojawaCommission,
    pricing.serviceFee,
    breakdown.serviceFee?.amount,
  );

  const vatAmount = pickAmount(
    overrides.vat,
    pricing.vat,
    breakdown.vat?.amount,
  );

  const stakeholders = [];

  if (vendorAmount > 0 && order.vendorId) {
    stakeholders.push({
      role: 'vendor',
      userId: order.vendorId,
      amount: vendorAmount,
      metadata: {
        label: 'Vendor subtotal',
        breakdown: {
          subtotal: vendorAmount,
        },
      },
    });
  }

  if (logisticsAmount > 0 && (order.selectedLogistics?.userId || order.selectedLogistics?.accountNumber)) {
    const logisticsStakeholder = {
      role: 'logistics',
      amount: logisticsAmount,
      metadata: {
        companyName: order.selectedLogistics?.companyName || order.selectedLogistics?.partner?.name || null,
        partnerId: order.selectedLogistics?.partner?.id || order.selectedLogistics?.id || null,
      },
    };

    if (order.selectedLogistics?.userId) {
      logisticsStakeholder.userId = order.selectedLogistics.userId;
    }

    if (order.selectedLogistics?.accountNumber && order.selectedLogistics?.bankCode) {
      logisticsStakeholder.account = {
        accountName: order.selectedLogistics?.accountName,
        accountNumber: order.selectedLogistics?.accountNumber,
        bankCode: order.selectedLogistics?.bankCode,
        bankName: order.selectedLogistics?.bankName || null,
      };
    }

    stakeholders.push(logisticsStakeholder);
  }

  const platformAmount = Math.max(0, commissionAmount + vatAmount);
  const platformConfig = getPlatformPayoutConfig();

  if (platformAmount > 0 && platformConfig.userId) {
    stakeholders.push({
      role: platformConfig.role,
      userId: platformConfig.userId,
      walletId: platformConfig.walletId,
      amount: platformAmount,
      metadata: {
        breakdown: {
          commission: commissionAmount,
          vat: vatAmount,
        },
      },
    });
  }

  const totals = {
    vendor: vendorAmount,
    logistics: logisticsAmount,
    commission: commissionAmount,
    vat: vatAmount,
    currency,
  };

  totals.total = Object.values({ ...totals, currency: undefined }).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);

  const vat = vatAmount > 0 ? {
    amount: vatAmount,
    currency,
    orderId: order.id,
    breakdown,
  } : null;

  return {
    stakeholders,
    totals,
    vat,
    metadata: {
      orderId: order.id,
      buyerId: order.buyerId,
      vendorId: order.vendorId,
      currency,
      createdAt: normalizeTimestamp(order.createdAt) || new Date().toISOString(),
    },
  };
};

export const buildVatLedgerEntry = (order = {}, vatData = {}, extra = {}) => {
  const amount = toNumber(vatData?.amount);
  if (!amount) return null;

  return {
    orderId: order.id,
    payoutRequestId: extra.payoutRequestId || null,
    buyerId: order.buyerId || null,
    vendorId: order.vendorId || null,
    amount,
    currency: vatData?.currency || order.currency || order.pricingBreakdown?.currency || 'NGN',
    breakdown: vatData?.breakdown || order.pricingBreakdown?.breakdown?.vat || null,
    status: extra.status || 'pending_remittance',
    metadata: {
      deliveryOption: order.deliveryOption || null,
      logisticsPartner: order.selectedLogistics?.companyName || order.selectedLogistics?.partner?.name || null,
      ...extra.metadata,
    },
    createdAt: normalizeTimestamp(extra.createdAt) || normalizeTimestamp(order.updatedAt) || new Date().toISOString(),
  };
};
