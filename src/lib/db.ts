'use client'

import { createClient } from '@/utils/supabase/client'
import { Category, Transaction, Budget, Workspace, SavingsGoal } from '@/types'

// Mock User Type
export type User = {
  id: string
  email: string
  name: string
  avatar_url: string
}

// Categorías iniciales predeterminadas (para auto-llenado de base de datos)
const DEFAULT_CATEGORIES = [
  { name: 'Salario', type: 'income' },
  { name: 'Inversiones', type: 'income' },
  { name: 'Otros Ingresos', type: 'income' },
  { name: 'Alquiler/Vivienda', type: 'expense' },
  { name: 'Alimentación', type: 'expense' },
  { name: 'Transporte', type: 'expense' },
  { name: 'Servicios Públicos', type: 'expense' },
  { name: 'Entretenimiento/Ocio', type: 'expense' },
  { name: 'Salud/Bienestar', type: 'expense' },
  { name: 'Educación', type: 'expense' },
  { name: 'Ahorro / Inversión', type: 'expense' },
]

const supabase = createClient()

export const LocalDB = {
  // --- AUTH ---
  async getCurrentUser(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return null
    return {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.user_metadata?.full_name || session.user.email!.split('@')[0],
      avatar_url: session.user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
    }
  },

  async signOut(): Promise<void> {
    await supabase.auth.signOut()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('finanzas_active_workspace')
    }
  },

  // --- WORKSPACES ---
  async getWorkspaces(): Promise<Workspace[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: workspacesData, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error

    let workspaces = workspacesData

    // Si el usuario no tiene espacios de trabajo, auto-creamos el primero
    if (!workspaces || workspaces.length === 0) {
      const { data: newWs, error: wsError } = await supabase
        .from('workspaces')
        .insert({
          name: 'Finanzas Personales',
          user_id: user.id
        })
        .select()

      if (wsError) throw wsError
      workspaces = newWs

      // Sembrar categorías iniciales para este espacio
      const activeWs = (workspaces && workspaces.length > 0) ? workspaces[0] : { id: 'fallback-ws-id' }
      const seedCats = DEFAULT_CATEGORIES.map(cat => ({
        name: cat.name,
        type: cat.type,
        workspace_id: activeWs.id,
        user_id: user.id
      }))

      await supabase.from('categories').insert(seedCats)
    }

    return workspaces as Workspace[]
  },

  async addWorkspace(name: string): Promise<Workspace> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        name,
        user_id: user.id
      })
      .select()

    if (error) throw error

    // Sembrar categorías iniciales para el nuevo espacio
    const activeWs = (data && data.length > 0) ? data[0] : { id: 'fallback-ws-id', name, user_id: user.id }
    const seedCats = DEFAULT_CATEGORIES.map(cat => ({
      name: cat.name,
      type: cat.type,
      workspace_id: activeWs.id,
      user_id: user.id
    }))
    await supabase.from('categories').insert(seedCats)

    this.dispatchEvent()
    return activeWs as Workspace
  },

  getActiveWorkspaceId(): string {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('finanzas_active_workspace') || ''
  },

  setActiveWorkspaceId(id: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('finanzas_active_workspace', id)
      this.dispatchEvent()
    }
  },

  // --- CATEGORIES ---
  async getCategories(): Promise<Category[]> {
    const activeWs = this.getActiveWorkspaceId()
    if (!activeWs) return []

    // Obtener las categorías que pertenezcan al espacio de trabajo actual
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('workspace_id', activeWs)
      .order('name', { ascending: true })

    if (error) throw error
    return data as Category[]
  },

  async addCategory(name: string, type: 'income' | 'expense'): Promise<Category> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const activeWs = this.getActiveWorkspaceId()
    if (!activeWs) throw new Error('No hay espacio activo')

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name,
        type,
        workspace_id: activeWs,
        user_id: user.id
      })
      .select()

    if (error) throw error
    this.dispatchEvent()
    return (data && data[0]) ? (data[0] as Category) : { id: 'fallback-cat-id', name, type, workspace_id: activeWs, user_id: user.id } as Category
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) throw error
    this.dispatchEvent()
  },

  // --- TRANSACTIONS ---
  async getTransactions(): Promise<Transaction[]> {
    const activeWs = this.getActiveWorkspaceId()
    if (!activeWs) return []

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('workspace_id', activeWs)
      .order('date', { ascending: false })

    if (error) throw error
    return data as Transaction[]
  },

  async addTransaction(tx: Omit<Transaction, 'id' | 'created_at' | 'workspace_id' | 'user_id'>): Promise<Transaction> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const activeWs = this.getActiveWorkspaceId()
    if (!activeWs) throw new Error('No hay espacio activo')

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        ...tx,
        workspace_id: activeWs,
        user_id: user.id
      })
      .select()

    if (error) throw error
    this.dispatchEvent()
    return (data && data[0]) ? (data[0] as Transaction) : { id: 'fallback-tx-id', ...tx, workspace_id: activeWs, user_id: user.id } as unknown as Transaction
  },

  async updateTransaction(id: string, updatedTx: Partial<Transaction>): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .update(updatedTx)
      .eq('id', id)
      .select()

    if (error) throw error
    this.dispatchEvent()
    return (data && data[0]) ? (data[0] as Transaction) : { id, ...updatedTx } as unknown as Transaction
  },

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) throw error
    this.dispatchEvent()
  },

  // --- BUDGETS ---
  async getBudgets(): Promise<Budget[]> {
    const activeWs = this.getActiveWorkspaceId()
    if (!activeWs) return []

    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('workspace_id', activeWs)

    if (error) throw error
    return data as Budget[]
  },

  async saveBudget(category_id: string, amount: number): Promise<Budget> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const activeWs = this.getActiveWorkspaceId()
    if (!activeWs) throw new Error('No hay espacio activo')

    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]

    // Comprobar si ya existe un presupuesto para esta categoría
    const { data: existing, error: fetchError } = await supabase
      .from('budgets')
      .select('*')
      .eq('category_id', category_id)
      .eq('workspace_id', activeWs)

    if (fetchError) throw fetchError

    let result
    if (existing && existing.length > 0) {
      const { data, error } = await supabase
        .from('budgets')
        .update({ amount })
        .eq('id', existing[0].id)
        .select()
      if (error) throw error
      result = (data && data[0]) ? data[0] : { id: existing[0].id, category_id, amount, workspace_id: activeWs, user_id: user.id, start_date: firstDay, end_date: lastDay }
    } else {
      const { data, error } = await supabase
        .from('budgets')
        .insert({
          category_id,
          amount,
          workspace_id: activeWs,
          user_id: user.id,
          start_date: firstDay,
          end_date: lastDay
        })
        .select()
      if (error) throw error
      result = (data && data[0]) ? data[0] : { id: 'fallback-budget-id', category_id, amount, workspace_id: activeWs, user_id: user.id, start_date: firstDay, end_date: lastDay }
    }

    this.dispatchEvent()
    return result as Budget
  },

  async deleteBudget(id: string): Promise<void> {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)

    if (error) throw error
    this.dispatchEvent()
  },

  // --- SAVINGS GOALS ---
  async getSavingsGoals(): Promise<SavingsGoal[]> {
    const activeWs = this.getActiveWorkspaceId()
    if (!activeWs) return []

    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('workspace_id', activeWs)

    if (error) throw error
    return data as SavingsGoal[]
  },

  async addSavingsGoal(name: string, target_amount: number, target_date?: string): Promise<SavingsGoal> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const activeWs = this.getActiveWorkspaceId()
    if (!activeWs) throw new Error('No hay espacio activo')

    const { data, error } = await supabase
      .from('savings_goals')
      .insert({
        name,
        target_amount,
        current_amount: 0,
        target_date: target_date || null,
        workspace_id: activeWs,
        user_id: user.id
      })
      .select()

    if (error) throw error
    this.dispatchEvent()
    return (data && data[0]) ? (data[0] as SavingsGoal) : { id: 'fallback-goal-id', name, target_amount, current_amount: 0, target_date: target_date || null, workspace_id: activeWs, user_id: user.id } as SavingsGoal
  },

  async adjustSavingsGoalAmount(id: string, amount: number, isContribution: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    
    const { data: goals, error: fetchError } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('id', id)

    if (fetchError || !goals || goals.length === 0) return

    const goal = goals[0] as SavingsGoal
    const delta = isContribution ? amount : -amount
    const nextAmount = Math.max(0, goal.current_amount + delta)

    const { error: updateError } = await supabase
      .from('savings_goals')
      .update({ current_amount: nextAmount })
      .eq('id', id)

    if (updateError) throw updateError

    // Intentamos buscar si existe la categoría "Ahorro / Inversión" en el espacio actual
    const activeWs = this.getActiveWorkspaceId()
    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .eq('workspace_id', activeWs)
      .eq('name', 'Ahorro / Inversión')
      .limit(1)

    let catId = cats && cats.length > 0 ? cats[0].id : null
    if (!catId && cats) {
      // Si no existe, usamos la primera categoría de gastos disponible o creamos una
      const { data: allCats } = await supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', activeWs)
        .eq('type', isContribution ? 'expense' : 'income')
        .limit(1)
      if (allCats && allCats.length > 0) catId = allCats[0].id
    }

    // Registrar transacción
    await this.addTransaction({
      description: `${isContribution ? 'Aporte' : 'Retiro'} meta: ${goal.name}`,
      amount: Math.abs(amount),
      type: isContribution ? 'expense' : 'income',
      category_id: catId || '',
      date: new Date().toISOString().split('T')[0]
    })

    this.dispatchEvent()
  },

  async deleteSavingsGoal(id: string): Promise<void> {
    const { error } = await supabase
      .from('savings_goals')
      .delete()
      .eq('id', id)

    if (error) throw error
    this.dispatchEvent()
  },

  // --- RESPALDOS JSON ---
  async exportAllDataJSON(): Promise<string> {
    const { data: workspaces } = await supabase.from('workspaces').select('*')
    const { data: categories } = await supabase.from('categories').select('*')
    const { data: transactions } = await supabase.from('transactions').select('*')
    const { data: budgets } = await supabase.from('budgets').select('*')
    const { data: savings_goals } = await supabase.from('savings_goals').select('*')

    const data = {
      workspaces: workspaces || [],
      categories: categories || [],
      transactions: transactions || [],
      budgets: budgets || [],
      savings_goals: savings_goals || []
    }
    return JSON.stringify(data, null, 2)
  },

  async importAllDataJSON(jsonStr: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonStr)
      if (data.workspaces && data.categories && data.transactions && data.budgets && data.savings_goals) {
        // En base de datos real, importar requiere insertar los registros de manera asíncrona
        // Por seguridad, este cargador local insertará en lote.
        // Hacemos inserts correspondientes en cascada.
        // Nota: para simplificar, borramos los datos actuales antes de importar
        const activeWs = this.getActiveWorkspaceId()
        if (!activeWs) return false

        await supabase.from('transactions').delete().eq('workspace_id', activeWs)
        await supabase.from('budgets').delete().eq('workspace_id', activeWs)
        await supabase.from('savings_goals').delete().eq('workspace_id', activeWs)
        
        // Insertar datos cargados
        if (data.transactions.length > 0) {
          const txsToInsert = data.transactions.map((t: Partial<Transaction>) => {
            const copy = { ...t }
            delete copy.id
            delete copy.created_at
            return copy
          })
          await supabase.from('transactions').insert(txsToInsert)
        }
        
        if (data.budgets.length > 0) {
          const budgetsToInsert = data.budgets.map((b: Partial<Budget>) => {
            const copy = { ...b }
            delete copy.id
            delete copy.created_at
            return copy
          })
          await supabase.from('budgets').insert(budgetsToInsert)
        }

        if (data.savings_goals.length > 0) {
          const goalsToInsert = data.savings_goals.map((g: Partial<SavingsGoal>) => {
            const copy = { ...g }
            delete copy.id
            delete copy.created_at
            return copy
          })
          await supabase.from('savings_goals').insert(goalsToInsert)
        }

        this.dispatchEvent()
        return true
      }
      return false
    } catch {
      return false
    }
  },

  // --- DISPATCH EVENTS ---
  dispatchEvent(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('finanzas_data_changed'))
    }
  }
}
