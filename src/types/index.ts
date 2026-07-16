export type Workspace = {
  id: string
  name: string
  user_id: string
  type?: 'personal' | 'home' | 'business' | 'other'
  created_at: string
}

export type WorkspaceMember = {
  id: string
  workspace_id: string
  invited_email: string
  created_at: string
}

export type Category = {
  id: string
  name: string
  type: 'income' | 'expense'
  parent_id?: string | null
  workspace_id?: string | null
  user_id?: string | null
  created_at: string
}

export type TransactionItem = {
  description: string
  amount: number
}

export type Transaction = {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category_id: string
  workspace_id: string
  user_id: string
  date: string
  details?: TransactionItem[] | null
  created_at: string
}

export type Budget = {
  id: string
  category_id: string
  amount: number
  workspace_id: string
  user_id: string
  start_date: string
  end_date: string
  created_at: string
}

export type ReportSettings = {
  workspace_id: string
  enabled: boolean
  period_days: number
  next_run: string
  created_at?: string
}

export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'

export type RecurringTransaction = {
  id: string
  workspace_id: string
  user_id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category_id: string | null
  frequency: RecurringFrequency
  next_date: string
  active: boolean
  created_at: string
}

export type SavingsGoal = {
  id: string
  name: string
  target_amount: number
  current_amount: number
  target_date?: string | null
  workspace_id: string
  user_id: string
  created_at: string
}
