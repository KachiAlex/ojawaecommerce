import React from 'react';

export const payoutStatusConfig = {
  pending: {
    label: 'Payout Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200'
  },
  processing: {
    label: 'Payout Processing',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200'
  },
  transfers_initiated: {
    label: 'Payout Sent',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200'
  },
  failed: {
    label: 'Payout Failed',
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200'
  }
};

export const formatAmountForPayout = (amount, currency = 'NGN') => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';
  const symbol = currency?.split?.(' ')?.[0] || '₦';
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

const breakdownLabels = [
  { key: 'vendor', label: 'Vendor' },
  { key: 'logistics', label: 'Logistics' },
  { key: 'commission', label: 'Commission' },
  { key: 'vat', label: 'VAT' }
];

const hasNumericValue = (value) => typeof value === 'number' && !Number.isNaN(value);

const PayoutStatusSummary = ({
  payoutStatus,
  payoutRequestId,
  payoutTotals,
  vat,
  currency,
  variant = 'card',
  className = '',
  showBreakdown = true,
  showVat = true
}) => {
  const enableBreakdown = showBreakdown !== false;
  const enableVat = showVat !== false;
  const hasVat = enableVat && hasNumericValue(vat?.amount) && vat.amount > 0;
  const breakdownCurrency = payoutTotals?.currency || currency;
  const breakdownValues = enableBreakdown && (payoutTotals && typeof payoutTotals === 'object') ? breakdownLabels
    .map(({ key, label }) => ({
      key,
      label,
      value: payoutTotals[key]
    }))
    .filter(({ value }) => hasNumericValue(value)) : [];
  const hasBreakdown = breakdownValues.length > 0;
  const shouldRender = Boolean(payoutStatus || hasBreakdown || hasVat);

  if (!shouldRender) return null;

  const statusMeta = payoutStatusConfig[payoutStatus] || {};
  const wrapperClass = (
    variant === 'card'
      ? `rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3 ${className}`
      : `space-y-2 text-xs text-gray-600 ${className}`
  ).trim();

  const statusLabel = payoutStatus
    ? (statusMeta.label || `Payout: ${payoutStatus}`)
    : 'Not queued yet';

  const renderStatusBadge = () => {
    if (!payoutStatus && variant === 'inline') {
      return null;
    }

    if (variant === 'inline') {
      return (
        <div
          className={`border rounded-md px-3 py-2 font-medium flex flex-col gap-1 ${statusMeta.bg || 'bg-gray-50'} ${statusMeta.border || 'border-gray-200'} ${statusMeta.text || 'text-gray-700'}`}
        >
          <span>{statusLabel}</span>
          <span className="text-[11px] font-normal opacity-80">
            {payoutRequestId ? `Request #${payoutRequestId.slice(-6)}` : 'Queued via automation'}
          </span>
        </div>
      );
    }

    return (
      <div
        className={`mt-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.bg || 'bg-gray-100'} ${statusMeta.text || 'text-gray-800'}`}
      >
        <span>{statusLabel}</span>
        {payoutRequestId && (
          <span className="text-[10px] opacity-80">#{payoutRequestId.slice(-8)}</span>
        )}
      </div>
    );
  };

  const renderBreakdown = () => {
    if (!hasBreakdown) return null;

    if (variant === 'inline') {
      return (
        <div className="text-xs text-gray-600 space-y-1">
          <p className="font-semibold text-gray-800">Payout Breakdown</p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {breakdownValues.map(({ key, label, value }) => (
              <div key={key} className="flex justify-between">
                <span>{label}</span>
                <span className="font-semibold text-gray-900">
                  {formatAmountForPayout(value, breakdownCurrency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="text-sm text-gray-600">
        <p className="font-medium text-gray-800 mb-1">Payout Breakdown</p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {breakdownValues.map(({ key, label, value }) => (
            <div key={key} className="space-y-1">
              <p className="text-gray-500">{label}</p>
              <p className="font-semibold text-gray-900">
                {formatAmountForPayout(value, breakdownCurrency)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderVat = () => {
    if (!hasVat) return null;
    const vatCurrency = vat?.currency || currency;

    if (variant === 'inline') {
      return (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-900">
          VAT {formatAmountForPayout(vat.amount, vatCurrency)} captured. Ojawa remits it once payouts clear.
        </div>
      );
    }

    return (
      <div className="rounded-md border border-amber-200 bg-white p-3 text-xs text-amber-800">
        <p className="font-semibold text-amber-900">VAT Ledger</p>
        <p>
          {formatAmountForPayout(vat.amount, vatCurrency)} captured for this order. We remit it to tax authorities once payout completes.
        </p>
      </div>
    );
  };

  return (
    <div className={wrapperClass}>
      {variant === 'card' && (
        <div>
          <p className="text-sm font-medium text-gray-700">Payout Status</p>
          {renderStatusBadge()}
        </div>
      )}
      {variant === 'inline' && renderStatusBadge()}
      {renderBreakdown()}
      {renderVat()}
    </div>
  );
};

export default PayoutStatusSummary;
