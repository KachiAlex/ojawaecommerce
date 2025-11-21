// Currency utilities for multi-currency support

// Currency data with exchange rates (to NGN)
export const CURRENCIES = {
  NGN: { symbol: '₦', name: 'Nigerian Naira', rate: 1, countries: ['Nigeria'] },
  GHS: { symbol: '₵', name: 'Ghanaian Cedi', rate: 0.08, countries: ['Ghana'] }, // 1 GHS ≈ 0.08 NGN
  KES: { symbol: 'KSh', name: 'Kenyan Shilling', rate: 0.06, countries: ['Kenya'] }, // 1 KES ≈ 0.06 NGN
  ETB: { symbol: 'Br', name: 'Ethiopian Birr', rate: 0.15, countries: ['Ethiopia'] }, // 1 ETB ≈ 0.15 NGN
  ZAR: { symbol: 'R', name: 'South African Rand', rate: 0.45, countries: ['South Africa'] }, // 1 ZAR ≈ 0.45 NGN
  USD: { symbol: '$', name: 'US Dollar', rate: 1650, countries: [] }, // 1 USD ≈ 1650 NGN
  GBP: { symbol: '£', name: 'British Pound', rate: 2100, countries: [] }, // 1 GBP ≈ 2100 NGN
  EUR: { symbol: '€', name: 'Euro', rate: 1800, countries: [] } // 1 EUR ≈ 1800 NGN
};

// Auto-detect currency based on country
export const detectCurrency = (country) => {
  for (const [code, data] of Object.entries(CURRENCIES)) {
    if (data.countries.includes(country)) {
      return code;
    }
  }
  return 'NGN'; // Default
};

// Get currency symbol
export const getCurrencySymbol = (currencyCode) => {
  return CURRENCIES[currencyCode]?.symbol || '₦';
};

// Convert between currencies
export const convertCurrency = (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return amount;
  
  const fromRate = CURRENCIES[fromCurrency]?.rate || 1;
  const toRate = CURRENCIES[toCurrency]?.rate || 1;
  
  // Convert to NGN first, then to target currency
  const inNGN = amount * fromRate;
  const converted = inNGN / toRate;
  
  return Math.round(converted);
};

// Format currency with symbol
export const formatCurrency = (amount, currencyCode = 'NGN') => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol} ${amount.toLocaleString()}`;
};

// Get dual currency display (show in NGN equivalent)
export const getDualCurrencyDisplay = (amount, currency) => {
  if (currency === 'NGN') return null;
  
  const ngnAmount = convertCurrency(amount, currency, 'NGN');
  return {
    original: formatCurrency(amount, currency),
    ngn: formatCurrency(ngnAmount, 'NGN'),
    text: `${formatCurrency(amount, currency)} (≈ ${formatCurrency(ngnAmount, 'NGN')})`
  };
};

// Get all available currencies
export const getAllCurrencies = () => {
  return Object.entries(CURRENCIES).map(([code, data]) => ({
    code,
    ...data,
    display: `${data.symbol} ${code} - ${data.name}`
  }));
};

// Validate currency code
export const isValidCurrency = (code) => {
  return CURRENCIES.hasOwnProperty(code);
};

