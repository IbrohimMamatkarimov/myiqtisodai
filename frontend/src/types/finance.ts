export interface CategoryBreakdown {
  category_id: string | null;
  category_name: string;
  total: number;
  percent: number;
}

export interface WeeklyTrend {
  label: string;
  income: number;
  expenses: number;
}

export interface BudgetStatus {
  category_name: string;
  limit_amount: number;
  spent_amount: number;
  remaining_amount: number;
  progress_percent: number;
  status: string;
}

export interface GoalProgress {
  title: string;
  target_amount: number;
  current_amount: number;
  progress_percent: number;
  deadline: string | null;
}

export interface DashboardSummary {
  total_income: number;
  total_expenses: number;
  remaining_balance: number;
  total_savings: number;

  financial_health_score: number;

  month_over_month_income_change_percent: number;
  month_over_month_expense_change_percent: number;

  safe_to_spend_today: number;

  top_expense_categories: CategoryBreakdown[];
  today_categories: CategoryBreakdown[];
  today_total: number;
  budgets: BudgetStatus[];
  weekly_trends: WeeklyTrend[];
  active_goals: GoalProgress[];
  budget_alerts: string[];

  active_goals_count: number;
  recent_transactions_count: number;
  completed_goals_count?: number;
  current_streak_days?: number;
  total_transactions_all_time?: number;

  // NEW
  monthly_budget?: number;
  budget_used_percent?: number;
  predicted_month_end_balance?: number;
  ai_summary?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string | null;
  color?: string | null;
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

  ai_image_url?: string | null;

  ai_category?: string | null;

  receipt_time?: string | null;

  tax_amount?: number | null;

  products?: string | null; // JSON-encoded ProductLine[]
}

export interface ProductLine {
  name: string;
  price: number | null;
}

export interface ReceiptScanResult {
  merchant_name: string | null;
  expense_date: string | null;
  receipt_time: string | null;
  amount: number | null;
  currency: string | null;
  category_name: string | null;
  category_id: string | null;
  products: ProductLine[];
  tax_amount: number | null;
  description: string | null;
  receipt_image: string | null;
  warning: string | null;
}

export interface PaginatedExpenses {
  items: Expense[];

  total: number;

  page: number;

  page_size: number;

  total_pages: number;
}

export interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string | null;
  image_url?: string | null;
  currency: string;
  is_completed: boolean;
  progress_percent: number;
}

export interface Income {
  id: string;
  category_id: string | null;
  source_name: string;
  amount: number;
  currency: string;
  description: string | null;
  income_date: string;
  is_recurring: boolean;
  recurrence_interval: string;
  created_at: string;
}
