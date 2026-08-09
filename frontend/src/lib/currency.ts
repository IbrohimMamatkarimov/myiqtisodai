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

/** Convert an amount from one currency directly into another, via UZS as
 * the common intermediate unit. Used for e.g. "let the user type in
 * whatever currency they have on hand, convert to the goal's currency
 * before sending it to the backend" - the backend only ever stores/sums
 * amounts in a record's own declared currency, it doesn't convert. */
export function convertBetween(amount: number, from: string, to: string): number {
  const fromCode = (from as CurrencyCode) in RATES_TO_UZS ? (from as CurrencyCode) : 'UZS';
  const toCode = (to as CurrencyCode) in RATES_TO_UZS ? (to as CurrencyCode) : 'UZS';
  if (fromCode === toCode) return amount;
  const amountUZS = amount * RATES_TO_UZS[fromCode];
  return amountUZS / RATES_TO_UZS[toCode];
}

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

/**
 * Formats an amount that's already denominated in `currency` - no UZS
 * conversion. Use this for anything stored per-record in its own currency
 * (goal target/current amounts, expense/income amounts): those numbers are
 * exactly what the user typed, in the currency they picked at the time.
 * formatAmount() is for the opposite case - dashboard/account totals, which
 * the backend always normalizes to UZS before sending. Mixing the two up
 * silently divides goal amounts by ~12700 for USD/EUR goals.
 */
export function formatCurrency(amount: number, currency: string): string {
  const code = (currency as CurrencyCode) in RATES_TO_UZS ? (currency as CurrencyCode) : 'UZS';
  const symbol = CURRENCY_SYMBOLS[code];
  const rounded = code === 'UZS' ? Math.round(amount) : Math.round(amount * 100) / 100;

  if (code === 'UZS') {
    return `${rounded.toLocaleString()} ${symbol}`;
  }
  return `${symbol}${rounded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
