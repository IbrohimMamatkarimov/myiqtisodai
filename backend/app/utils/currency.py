"""Currency conversion helpers.

The app stores each expense/income with its own `currency` field (UZS, USD, or
EUR), but all backend aggregation (dashboard totals, budgets, category
breakdowns) needs a single common unit to sum in. We convert everything to
UZS at query time using fixed approximate rates, mirroring the rates used in
frontend/src/lib/currency.ts. Keep these two in sync if rates are updated.
"""

from sqlalchemy import case

# Units of UZS per 1 unit of the given currency.
RATES_TO_UZS = {
    "UZS": 1,
    "USD": 12700,
    "EUR": 13700,
}


def amount_in_uzs(model, amount_col):
    """Build a SQL expression that converts `amount_col` (in the row's own
    currency) into UZS, based on that row's `currency` column."""
    return case(
        (model.currency == "USD", amount_col * RATES_TO_UZS["USD"]),
        (model.currency == "EUR", amount_col * RATES_TO_UZS["EUR"]),
        else_=amount_col,  # UZS or unknown/missing currency: assume already UZS
    )
