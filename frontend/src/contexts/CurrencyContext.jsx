import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { currencyService } from '../services/currencyService';

const CurrencyContext = createContext();

const STORAGE_KEY = '__preferred_currency__';
const FALLBACK_RATES = {
  base: 'NGN',
  rates: { NGN: 1, USD: 0.000606, EUR: 0.000556, GBP: 0.000476, GHS: 0.012, KES: 0.078, ETB: 0.071, ZAR: 0.011, KRW: 0.89, JPY: 0.097, CNY: 0.0044, INR: 0.050, CAD: 0.000833, AUD: 0.000926 },
  symbols: { NGN: '₦', USD: '$', EUR: '€', GBP: '£', GHS: '₵', KES: 'KSh', ETB: 'Br', ZAR: 'R', KRW: '₩', JPY: '¥', CNY: '¥', INR: '₹', CAD: 'C$', AUD: 'A$' },
  names: { NGN: 'Nigerian Naira', USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', GHS: 'Ghanaian Cedi', KES: 'Kenyan Shilling', ETB: 'Ethiopian Birr', ZAR: 'South African Rand', KRW: 'South Korean Won', JPY: 'Japanese Yen', CNY: 'Chinese Yuan', INR: 'Indian Rupee', CAD: 'Canadian Dollar', AUD: 'Australian Dollar' },
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
};

export const CurrencyProvider = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  const [preferredCurrency, setPreferredCurrency] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'NGN'; } catch { return 'NGN'; }
  });
  const [rates, setRates] = useState(FALLBACK_RATES.rates);
  const [symbols, setSymbols] = useState(FALLBACK_RATES.symbols);
  const [names, setNames] = useState(FALLBACK_RATES.names);
  const [loading, setLoading] = useState(true);

  // Fetch exchange rates from backend
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await currencyService.getRates();
        if (!cancelled && data) {
          setRates(data.rates);
          setSymbols(data.symbols);
          setNames(data.names);
        }
      } catch {
        // Keep fallback rates
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load preferred currency from user profile or localStorage
  useEffect(() => {
    if (userProfile?.profile?.preferredCurrency) {
      const curr = userProfile.profile.preferredCurrency;
      setPreferredCurrency(curr);
      try { localStorage.setItem(STORAGE_KEY, curr); } catch { /* ignore */ }
    } else if (currentUser) {
      // Try to detect from user's country
      const country = userProfile?.profile?.country || userProfile?.country;
      if (country) {
        currencyService.detectFromCountry(country).then(data => {
          if (data?.currency) {
            setPreferredCurrency(data.currency);
            try { localStorage.setItem(STORAGE_KEY, data.currency); } catch { /* ignore */ }
          }
        }).catch(() => {});
      }
    }
  }, [currentUser, userProfile]);

  const changeCurrency = useCallback((currency) => {
    setPreferredCurrency(currency);
    try { localStorage.setItem(STORAGE_KEY, currency); } catch { /* ignore */ }
  }, []);

  // Convert amount from one currency to preferred currency
  const convert = useCallback((amount, fromCurrency = 'NGN', toCurrency = preferredCurrency) => {
    if (fromCurrency === toCurrency) return amount;
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];
    if (!fromRate || !toRate) return amount;
    // Convert via base (NGN): amount_in_base = amount / fromRate; result = amount_in_base * toRate
    const amountInBase = amount / fromRate;
    return Math.round(amountInBase * toRate * 100) / 100;
  }, [rates, preferredCurrency]);

  // Format amount with currency symbol
  const formatPrice = useCallback((amount, fromCurrency = 'NGN', opts = {}) => {
    const { showOriginal = false, decimals = 2 } = opts;
    const convertedAmount = convert(amount, fromCurrency, preferredCurrency);
    const symbol = symbols[preferredCurrency] || '';

    if (showOriginal && fromCurrency !== preferredCurrency) {
      const originalSymbol = symbols[fromCurrency] || '';
      const originalStr = `${originalSymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: decimals })}`;
      const convertedStr = `${symbol}${convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: decimals })}`;
      return `${convertedStr} (${originalStr})`;
    }

    return `${symbol}${convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: decimals })}`;
  }, [convert, preferredCurrency, symbols]);

  // Format amount in a specific currency (no conversion)
  const formatInCurrency = useCallback((amount, currency = preferredCurrency, decimals = 2) => {
    const symbol = symbols[currency] || '';
    return `${symbol}${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: decimals })}`;
  }, [symbols, preferredCurrency]);

  const availableCurrencies = useMemo(() => {
    return Object.keys(rates).map(code => ({
      code,
      symbol: symbols[code] || code,
      name: names[code] || code,
    }));
  }, [rates, symbols, names]);

  const value = useMemo(() => ({
    preferredCurrency,
    rates,
    symbols,
    names,
    loading,
    availableCurrencies,
    convert,
    formatPrice,
    formatInCurrency,
    changeCurrency,
  }), [preferredCurrency, rates, symbols, names, loading, availableCurrencies, convert, formatPrice, formatInCurrency, changeCurrency]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};
