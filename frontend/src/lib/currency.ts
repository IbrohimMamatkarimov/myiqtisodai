// Currency conversion + formatting.
//
// The backend stores/sums amounts as entered (mostly UZS) and has no
// exchange-rate service, so this uses fixed approximate rates as a
// stopgap so the currency picker in Settings actually changes what's
// shown on screen. Swap RATES_TO_UZS for a live-rate API call if/when
// the backend exposes one.

export type CurrencyCode = 'UZS' | 'USD' | 'EUR';

// Units of UZS per 1 unit of the given currency (update periodically).
const RATES_TO_UZS: Record<CurrencyCode, number> = {
  UZS: 1,
  USD: 12700,
  EUR: 13700,
};

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  UZS: 'UZS',
  USD: '$',
  EUR: '€',
};

/** Convert an amount stored in UZS into the given display currency. */
export function convertFromUZS(amountUZS: number, to: CurrencyCode): number {
  const rate = RATES_TO_UZS[to] || 1;
  return amountUZS / rate;
}

/** Format an amount (already in UZS) for display in the user's chosen currency. */
export function formatAmount(amountUZS: number, currency: string): string {
  const code = (currency as CurrencyCode) in RATES_TO_UZS ? (currency as CurrencyCode) : 'UZS';
  const converted = convertFromUZS(amountUZS, code);
  const rounded = code === 'UZS' ? Math.round(converted) : Math.round(converted * 100) / 100;
  const symbol = CURRENCY_SYMBOLS[code];

  if (code === 'UZS') {
    return `${rounded.toLocaleString()} ${symbol}`;
  }
  return `${symbol}${rounded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
