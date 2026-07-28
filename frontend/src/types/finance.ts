export interface CategoryBreakdown {
  category_id: string | null;
  category_name: string;
  total: number;
  percent: number;
}

export interface DashboardSummary {
  total_income: number;
  total_expenses: number;
  remaining_balance: number;
  total_savings: number;

  financial_health_score: number;

  month_over_month_income_change_percent: number;
  month_over_month_expense_change_percent: number;

  top_expense_categories: CategoryBreakdown[];

  active_goals_count: number;
  recent_transactions_count: number;

  // NEW
  monthly_budget?: number;
  budget_used_percent?: number;
  predicted_month_end_balance?: number;
  ai_summary?: string;
}

export interface Expense {
  id: string;

  category_id: string | null;

  amount: number;

  currency: string;

  description: string | null;

  expense_date: string;

  is_recurring: boolean;

  recurrence_interval: string;

  created_at: string;

  // NEW (Receipt Scanner)
  merchant_name?: string | null;

  receipt_number?: string | null;

  payment_method?: string | null;

  receipt_image?: string | null;

  ai_category?: string | null;
}

export interface PaginatedExpenses {
  items: Expense[];

  total: number;

  page: number;

  page_size: number;

  total_pages: number;
}
