export type Workspace = {
  id: string
  name: string
  user_id: string
  created_at: string
}

export type Category = {
  id: string
  name: string
  type: 'income' | 'expense'
  workspace_id?: string | null
  user_id?: string | null
  created_at: string
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
