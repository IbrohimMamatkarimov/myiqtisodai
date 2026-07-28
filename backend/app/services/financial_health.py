from math import sqrt


def calculate_financial_health_score(
    total_income: float,
    total_expenses: float,
    total_savings: float,
    goals_on_track: int,
    goals_total: int,
    budgets_over_limit: int,
    budgets_total: int,
) -> int:
    """
    Financial Health Score (0-100)

    Components:

    35 pts → Savings Rate
    25 pts → Spending Control
    20 pts → Budget Discipline
    20 pts → Goal Progress

    Score meanings:

    90-100 Excellent
    75-89  Very Good
    60-74  Good
    40-59  Needs Improvement
    0-39   High Risk
    """

    score = 0.0

    # ------------------------
    # Savings Rate (35)
    # ------------------------
    if total_income > 0:
        savings_rate = max(
            0,
            (total_income - total_expenses) / total_income
        )

        if savings_rate >= 0.30:
            score += 35
        elif savings_rate >= 0.20:
            score += 30
        elif savings_rate >= 0.10:
            score += 22
        elif savings_rate > 0:
            score += 12

    # ------------------------
    # Spending Control (25)
    # ------------------------
    if total_income > 0:
        spending_ratio = total_expenses / total_income

        if spending_ratio <= 0.60:
            score += 25
        elif spending_ratio <= 0.75:
            score += 20
        elif spending_ratio <= 0.90:
            score += 14
        elif spending_ratio <= 1:
            score += 8

    # ------------------------
    # Budget Discipline (20)
    # ------------------------
    if budgets_total > 0:
        ratio = (budgets_total - budgets_over_limit) / budgets_total
        score += ratio * 20
    else:
        score += 12

    # ------------------------
    # Goal Progress (20)
    # ------------------------
    if goals_total > 0:
        ratio = goals_on_track / goals_total
        score += ratio * 20
    else:
        score += 10

    # ------------------------
    # Bonus
    # ------------------------
    if total_savings > total_income * 0.50:
        score += 3

    if budgets_total > 0 and budgets_over_limit == 0:
        score += 2

    score = max(0, min(100, round(score)))

    return score
