def calculate_financial_health_score(
    total_income: float,
    total_expenses: float,
    total_savings: float,
    goals_on_track: int,
    goals_total: int,
    budgets_over_limit: int,
    budgets_total: int,
) -> int:
    """A simple, explainable 0-100 score. Weighted components:
    - Savings rate (40 pts): how much of income is kept vs spent
    - Budget discipline (30 pts): share of budgets not exceeded
    - Goal progress (30 pts): share of active goals on track
    """
    score = 0.0

    if total_income > 0:
        savings_rate = max(0.0, (total_income - total_expenses) / total_income)
        score += min(savings_rate, 1.0) * 40
    else:
        score += 0

    if budgets_total > 0:
        budget_ok_ratio = (budgets_total - budgets_over_limit) / budgets_total
        score += budget_ok_ratio * 30
    else:
        score += 20  # neutral default when no budgets configured yet

    if goals_total > 0:
        score += (goals_on_track / goals_total) * 30
    else:
        score += 15  # neutral default when no goals configured yet

    return round(min(max(score, 0), 100))
