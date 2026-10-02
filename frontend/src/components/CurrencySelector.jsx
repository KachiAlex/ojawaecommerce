import { useCurrency } from '../contexts/CurrencyContext';

export default function CurrencySelector({ className = '', compact = false }) {
  const { preferredCurrency, availableCurrencies, changeCurrency } = useCurrency();

  return (
    <select
      value={preferredCurrency}
      onChange={(e) => changeCurrency(e.target.value)}
      className={`bg-slate-800 text-teal-200 text-sm border border-emerald-900/50 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-600 ${className}`}
      aria-label="Select currency"
    >
      {availableCurrencies.map(c => (
        <option key={c.code} value={c.code}>
          {compact ? `${c.symbol} ${c.code}` : `${c.symbol} ${c.code} — ${c.name}`}
        </option>
      ))}
    </select>
  );
}
