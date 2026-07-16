'use client'

import { createClient } from '@/utils/supabase/client'
import { Category, Transaction, Budget, Workspace, SavingsGoal, WorkspaceMember, RecurringTransaction, RecurringFrequency, ReportSettings } from '@/types'

// Mock User Type
export type User = {
  id: string
  email: string
  name: string
  avatar_url: string
}

// Tipos de espacio de trabajo
export type WorkspaceType = 'personal' | 'home' | 'business' | 'other'

type SeedCategory = { name: string; type: 'income' | 'expense'; children?: { name: string }[] }

// Plantillas de categorías por tipo de espacio (auto-llenado inicial)
export const CATEGORY_TEMPLATES: Record<WorkspaceType, SeedCategory[]> = {
  personal: [
    { name: 'Salario', type: 'income' },
    { name: 'Inversiones', type: 'income' },
    { name: 'Otros Ingresos', type: 'income' },
    { name: 'Alquiler/Vivienda', type: 'expense' },
    { name: 'Alimentación', type: 'expense', children: [
      { name: 'Supermercado' }, { name: 'Restaurante' }, { name: 'Cafetería' }, { name: 'Domicilios' }
    ]},
    { name: 'Transporte', type: 'expense', children: [
      { name: 'Gasolina' }, { name: 'Uber/Taxi' }, { name: 'Transporte Público' }
    ]},
    { name: 'Servicios Públicos', type: 'expense' },
    { name: 'Entretenimiento/Ocio', type: 'expense', children: [
      { name: 'Streaming' }, { name: 'Salidas' }, { name: 'Viajes' }
    ]},
    { name: 'Salud/Bienestar', type: 'expense', children: [
      { name: 'Medicamentos' }, { name: 'Consultas' }, { name: 'Gimnasio' }
    ]},
    { name: 'Educación', type: 'expense' },
    { name: 'Ahorro / Inversión', type: 'expense' },
  ],
  home: [
    { name: 'Ingresos del Hogar', type: 'income' },
    { name: 'Otros Ingresos', type: 'income' },
    { name: 'Mercado / Alimentación', type: 'expense', children: [
      { name: 'Supermercado' }, { name: 'Restaurante' }, { name: 'Cafetería' }, { name: 'Domicilios' }
    ]},
    { name: 'Arriendo / Hipoteca', type: 'expense' },
    { name: 'Servicios (Agua/Luz/Gas)', type: 'expense' },
    { name: 'Internet / TV', type: 'expense' },
    { name: 'Transporte', type: 'expense' },
    { name: 'Salud', type: 'expense' },
    { name: 'Educación', type: 'expense' },
    { name: 'Mantenimiento del Hogar', type: 'expense' },
    { name: 'Entretenimiento', type: 'expense' },
    { name: 'Ahorro Familiar', type: 'expense' },
  ],
  business: [
    { name: 'Ventas', type: 'income' },
    { name: 'Servicios Prestados', type: 'income' },
    { name: 'Otros Ingresos', type: 'income' },
    { name: 'Nómina / Salarios', type: 'expense' },
    { name: 'Proveedores / Inventario', type: 'expense' },
    { name: 'Arriendo Local', type: 'expense' },
    { name: 'Servicios Públicos', type: 'expense' },
    { name: 'Marketing / Publicidad', type: 'expense' },
    { name: 'Impuestos', type: 'expense' },
    { name: 'Software / Herramientas', type: 'expense' },
    { name: 'Transporte / Logística', type: 'expense' },
    { name: 'Reinversión', type: 'expense' },
  ],
  other: [
    { name: 'Ingresos', type: 'income' },
    { name: 'Otros Ingresos', type: 'income' },
    { name: 'Gastos Generales', type: 'expense' },
    { name: 'Otros Gastos', type: 'expense' },
  ],
}

// Helper: construye un árbol de categorías a partir de la lista plana
export type CategoryNode = Category & { children: CategoryNode[] }
export function buildCategoryTree(cats: Category[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>()
  const roots: CategoryNode[] = []
  cats.forEach(c => map.set(c.id, { ...c, children: [] }))
  cats.forEach(c => {
    const node = map.get(c.id)!
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

// Avanza una fecha (YYYY-MM-DD) según la frecuencia de recurrencia
export function advanceDate(dateStr: string, frequency: RecurringFrequency): string {
  const d = new Date(dateStr + 'T00:00:00')
  switch (frequency) {
    case 'daily': d.setDate(d.getDate() + 1); break
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'biweekly': d.setDate(d.getDate() + 14); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'quarterly': d.setMonth(d.getMonth() + 3); break
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break
  }
  return d.toISOString().split('T')[0]
}

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

    const workspaces = workspacesData || []

    // Todo usuario debe tener su propio espacio personal (no compartible),
    // aunque solo tenga espacios donde es invitado. Si no posee ninguno, lo creamos.
    const ownsAny = workspaces.some((w) => w.user_id === user.id)
    if (!ownsAny) {
      const { data: newWs, error: wsError } = await supabase
        .from('workspaces')
        .insert({
          name: 'Finanzas Personales',
          user_id: user.id,
          type: 'personal'
        })
        .select()

      if (wsError) throw wsError

      const created = (newWs && newWs.length > 0) ? newWs[0] : null
      if (created) {
        // Sembrar categorías iniciales (plantilla personal) con subcategorías
        await this.seedCategoriesFromTemplate('personal', created.id, user.id)

        // El personal va primero para que sea el espacio activo por defecto
        workspaces.unshift(created)

        // Correo de bienvenida (primer login). Fire-and-forget.
        if (typeof window !== 'undefined') {
          fetch('/api/welcome', { method: 'POST' }).catch(() => {})
        }
      }
    }

    return workspaces as Workspace[]
  },

  // Resumen del mes actual por cada espacio accesible (para el panel general)
  async getWorkspacesOverview(): Promise<(Workspace & { isOwner: boolean; income: number; expense: number; net: number })[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const wss = await this.getWorkspaces()
    const monthStart = new Date().toISOString().substring(0, 7) + '-01'

    const { data: txs } = await supabase
      .from('transactions')
      .select('workspace_id, type, amount')
      .gte('date', monthStart)

    const agg = new Map<string, { income: number; expense: number }>()
    ;(txs || []).forEach((t) => {
      const cur = agg.get(t.workspace_id) || { income: 0, expense: 0 }
      if (t.type === 'income') cur.income += Number(t.amount)
      else cur.expense += Number(t.amount)
      agg.set(t.workspace_id, cur)
    })

    return wss.map((w) => {
      const a = agg.get(w.id) || { income: 0, expense: 0 }
      return { ...w, isOwner: w.user_id === user.id, income: a.income, expense: a.expense, net: a.income - a.expense }
    })
  },

  async addWorkspace(name: string, wsType: WorkspaceType = 'other'): Promise<Workspace> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')

    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        name,
        user_id: user.id,
        type: wsType
      })
      .select()

    if (error) throw error

    // Sembrar categorías según la plantilla del tipo elegido (con subcategorías)
    const activeWs = (data && data.length > 0) ? data[0] : { id: 'fallback-ws-id', name, user_id: user.id, type: wsType }
    await this.seedCategoriesFromTemplate(wsType, activeWs.id, user.id)

    this.dispatchEvent()
    return activeWs as Workspace
  },

  // --- WORKSPACE MEMBERS (compartir por email) ---
  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data as WorkspaceMember[]
  },

  async addWorkspaceMember(workspaceId: string, email: string): Promise<WorkspaceMember> {
    const clean = email.trim().toLowerCase()
    if (!clean) throw new Error('Email vacío')

    const { data, error } = await supabase
      .from('workspace_members')
      .insert({ workspace_id: workspaceId, invited_email: clean })
      .select()

    if (error) throw error
    this.dispatchEvent()
    return (data && data[0]) ? (data[0] as WorkspaceMember) : { id: 'fallback-member-id', workspace_id: workspaceId, invited_email: clean, created_at: new Date().toISOString() }
  },

  async removeWorkspaceMember(id: string): Promise<void> {
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', id)

    if (error) throw error
    this.dispatchEvent()
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

  async addCategory(name: string, type: 'income' | 'expense', parent_id?: string | null): Promise<Category> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const activeWs = this.getActiveWorkspaceId()
    if (!activeWs) throw new Error('No hay espacio activo')

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name,
        type,
        parent_id: parent_id || null,
        workspace_id: activeWs,
        user_id: user.id
      })
      .select()

    if (error) throw error
    this.dispatchEvent()
    return (data && data[0]) ? (data[0] as Category) : { id: 'fallback-cat-id', name, type, parent_id: parent_id || null, workspace_id: activeWs, user_id: user.id } as Category
  },

  async updateCategory(id: string, patch: { name?: string; parent_id?: string | null }): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .update(patch)
      .eq('id', id)

    if (error) throw error
    this.dispatchEvent()
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

  async clearWorkspaceTransactions(workspaceId: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('workspace_id', workspaceId)

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

  // --- RECURRING TRANSACTIONS (recurrentes con confirmación) ---
  async getRecurring(): Promise<RecurringTransaction[]> {
    const activeWs = this.getActiveWorkspaceId()
    if (!activeWs) return []

    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('workspace_id', activeWs)
      .order('next_date', { ascending: true })

    if (error) throw error
    return data as RecurringTransaction[]
  },

  // Recurrentes activas cuya próxima fecha ya llegó (pendientes por confirmar)
  async getDueRecurring(): Promise<RecurringTransaction[]> {
    const all = await this.getRecurring()
    const today = new Date().toISOString().split('T')[0]
    return all.filter(r => r.active && r.next_date <= today)
  },

  async addRecurring(payload: {
    description: string
    amount: number
    type: 'income' | 'expense'
    category_id: string | null
    frequency: RecurringFrequency
    next_date: string
  }): Promise<RecurringTransaction> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const activeWs = this.getActiveWorkspaceId()
    if (!activeWs) throw new Error('No hay espacio activo')

    const { data, error } = await supabase
      .from('recurring_transactions')
      .insert({ ...payload, active: true, workspace_id: activeWs, user_id: user.id })
      .select()

    if (error) throw error
    this.dispatchEvent()
    return (data && data[0]) as RecurringTransaction
  },

  async updateRecurring(id: string, patch: Partial<RecurringTransaction>): Promise<void> {
    const { error } = await supabase
      .from('recurring_transactions')
      .update(patch)
      .eq('id', id)

    if (error) throw error
    this.dispatchEvent()
  },

  async deleteRecurring(id: string): Promise<void> {
    const { error } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('id', id)

    if (error) throw error
    this.dispatchEvent()
  },

  // Confirmar: crea la transacción real y avanza la próxima fecha
  async confirmRecurring(rec: RecurringTransaction): Promise<void> {
    await this.addTransaction({
      description: rec.description,
      amount: rec.amount,
      type: rec.type,
      category_id: rec.category_id || '',
      date: rec.next_date,
    })
    await this.updateRecurring(rec.id, { next_date: advanceDate(rec.next_date, rec.frequency) })
  },

  // Posponer: avanza la próxima fecha sin registrar la transacción
  async skipRecurring(rec: RecurringTransaction): Promise<void> {
    await this.updateRecurring(rec.id, { next_date: advanceDate(rec.next_date, rec.frequency) })
  },

  // --- CONFIG DE REPORTES IA ---
  async getReportSettings(): Promise<ReportSettings | null> {
    const activeWs = this.getActiveWorkspaceId()
    if (!activeWs) return null
    const { data, error } = await supabase
      .from('report_settings')
      .select('*')
      .eq('workspace_id', activeWs)
      .maybeSingle()
    if (error) throw error
    return (data as ReportSettings) || null
  },

  async saveReportSettings(settings: { enabled: boolean; period_days: number; next_run: string }): Promise<void> {
    const activeWs = this.getActiveWorkspaceId()
    if (!activeWs) throw new Error('No hay espacio activo')
    const { error } = await supabase
      .from('report_settings')
      .upsert({ workspace_id: activeWs, ...settings }, { onConflict: 'workspace_id' })
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

  // --- SEED CATEGORIES WITH SUBCATEGORIES ---
  async seedCategoriesFromTemplate(wsType: WorkspaceType, workspaceId: string, userId: string): Promise<void> {
    const template = CATEGORY_TEMPLATES[wsType] || CATEGORY_TEMPLATES.other
    for (const cat of template) {
      const { data: parentData } = await supabase
        .from('categories')
        .insert({ name: cat.name, type: cat.type, workspace_id: workspaceId, user_id: userId })
        .select('id')
      if (cat.children && cat.children.length > 0 && parentData && parentData[0]) {
        const children = cat.children.map(child => ({
          name: child.name,
          type: cat.type,
          parent_id: parentData[0].id,
          workspace_id: workspaceId,
          user_id: userId
        }))
        await supabase.from('categories').insert(children)
      }
    }
  },

  // --- BULK INSERT (for imports) ---
  async bulkAddTransactions(txs: Omit<Transaction, 'id' | 'created_at'>[]): Promise<void> {
    if (txs.length === 0) return
    // Insert in batches of 100
    for (let i = 0; i < txs.length; i += 100) {
      const batch = txs.slice(i, i + 100)
      const { error } = await supabase.from('transactions').insert(batch)
      if (error) throw error
    }
    this.dispatchEvent()
  },

  async bulkAddCategories(cats: { name: string; type: 'income' | 'expense'; parent_id?: string | null }[]): Promise<Category[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autenticado')
    const activeWs = this.getActiveWorkspaceId()
    if (!activeWs) throw new Error('No hay espacio activo')

    const toInsert = cats.map(c => ({
      ...c,
      parent_id: c.parent_id || null,
      workspace_id: activeWs,
      user_id: user.id
    }))
    const { data, error } = await supabase.from('categories').insert(toInsert).select()
    if (error) throw error
    this.dispatchEvent()
    return (data || []) as Category[]
  },

  // --- DISPATCH EVENTS ---
  dispatchEvent(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('finanzas_data_changed'))
    }
  }
}
