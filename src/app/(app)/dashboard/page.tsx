'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { LocalDB, WorkspaceType } from '@/lib/db'
import { Transaction, Category, Budget, RecurringTransaction, WorkspaceOverview, WorkspaceMember } from '@/types'
import DashboardCharts from '@/components/DashboardCharts'
import { getWorkspaceAccountMeta, WS_TYPES } from '@/lib/workspaceMeta'
import {
  FiPlus,
  FiRepeat,
  FiArrowUpRight,
  FiArrowDownRight,
  FiAlertTriangle,
  FiChevronDown,
  FiMove,
  FiCheck,
  FiX,
  FiUsers,
  FiTrash2,
  FiCopy,
  FiEdit2,
  FiRefreshCw
} from 'react-icons/fi'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const DEFAULT_ORDER = ['metrics', 'summary', 'forecast', 'charts', 'budgets', 'activity']

function SortableWidget({ id, editing, children }: { id: string; editing: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 50 : undefined,
  }
  return (
    <div ref={setNodeRef} style={style} className={`relative ${editing ? 'rounded-md outline-dashed outline-1 outline-emerald-500/40' : ''}`}>
      {editing && (
        <button
          {...attributes}
          {...listeners}
          type="button"
          title="Arrastrar para reordenar"
          className="absolute top-2 right-2 z-20 p-1.5 bg-emerald-600 text-white rounded-md cursor-grab active:cursor-grabbing shadow touch-none"
        >
          <FiMove className="w-3.5 h-3.5" />
        </button>
      )}
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [dueRecurring, setDueRecurring] = useState<RecurringTransaction[]>([])
  const [allRecurring, setAllRecurring] = useState<RecurringTransaction[]>([])
  const [overview, setOverview] = useState<WorkspaceOverview[]>([])
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [newAccountType, setNewAccountType] = useState<WorkspaceType>('other')
  const [creatingAccount, setCreatingAccount] = useState(false)
  const [sharingWs, setSharingWs] = useState<WorkspaceOverview | null>(null)
  const [sharingMembers, setSharingMembers] = useState<WorkspaceMember[]>([])
  const [sharingMemberEmail, setSharingMemberEmail] = useState('')
  const [sharingMembersLoading, setSharingMembersLoading] = useState(false)
  const [sharingAdding, setSharingAdding] = useState(false)
  const [editingWs, setEditingWs] = useState<WorkspaceOverview | null>(null)
  const [editWsName, setEditWsName] = useState('')
  const [editWsType, setEditWsType] = useState<WorkspaceType>('other')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingWs, setDeletingWs] = useState<WorkspaceOverview | null>(null)
  const [deletingLoading, setDeletingLoading] = useState(false)
  const [activeWsId, setActiveWsId] = useState('')
  const [loading, setLoading] = useState(true)

  const loadDashboardData = async () => {
    setActiveWsId(LocalDB.getActiveWorkspaceId())
    try {
      const txs = await LocalDB.getTransactions()
      const cats = await LocalDB.getCategories()
      const bud = await LocalDB.getBudgets()
      setTransactions(txs)
      setCategories(cats)
      setBudgets(bud)
    } catch (e) {
      console.error('Error cargando datos locales', e)
    } finally {
      setLoading(false)
    }
    // Panel de espacios y bolsillos
    try {
      const ov = await LocalDB.getWorkspacesOverview()
      setOverview(ov)
    } catch {
      setOverview([])
    }
    // Recurrentes (tabla opcional: no romper si aún no existe)
    try {
      const rec = await LocalDB.getRecurring()
      setAllRecurring(rec)
      const t = new Date().toISOString().split('T')[0]
      setDueRecurring(rec.filter((r) => r.active && r.next_date <= t))
    } catch {
      setDueRecurring([])
      setAllRecurring([])
    }
  }

  const handleCreateQuickAccount = async (name: string, type: WorkspaceType = 'other') => {
    const trimmed = name.trim()
    if (!trimmed) return
    setCreatingAccount(true)
    try {
      const created = await LocalDB.addWorkspace(trimmed, type)
      toast.success(`Cuenta "${trimmed}" creada con éxito`)
      setIsAddAccountOpen(false)
      setNewAccountName('')
      await loadDashboardData()
      switchWorkspace(created.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear la cuenta')
    } finally {
      setCreatingAccount(false)
    }
  }

  const openShareModalForWs = async (ws: WorkspaceOverview) => {
    setSharingWs(ws)
    setSharingMemberEmail('')
    setSharingMembersLoading(true)
    try {
      const mems = await LocalDB.getWorkspaceMembers(ws.id)
      setSharingMembers(mems)
    } catch {
      toast.error('No se pudieron cargar los miembros')
    } finally {
      setSharingMembersLoading(false)
    }
  }

  const handleAddMemberToWs = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sharingWs) return
    const email = sharingMemberEmail.trim().toLowerCase()
    if (!email) return
    setSharingAdding(true)
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: sharingWs.id, email }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'No se pudo vincular')
        return
      }
      if (data.member) setSharingMembers((prev) => [...prev, data.member])
      setSharingMemberEmail('')
      toast.success(data.emailed ? 'Invitación enviada por correo' : 'Usuario vinculado a la cuenta')
    } catch {
      toast.error('Error al vincular el usuario')
    } finally {
      setSharingAdding(false)
    }
  }

  const handleRemoveMemberFromWs = async (memberId: string) => {
    try {
      await LocalDB.removeWorkspaceMember(memberId)
      setSharingMembers((prev) => prev.filter((m) => m.id !== memberId))
      toast.success('Acceso revocado')
    } catch {
      toast.error('Error al revocar acceso')
    }
  }

  const handleCopyInviteLink = () => {
    if (typeof window === 'undefined') return
    const url = `${window.location.origin}/login`
    navigator.clipboard.writeText(url)
    toast.success('Enlace de acceso copiado al portapapeles')
  }

  const openEditModal = (ws: WorkspaceOverview) => {
    setEditingWs(ws)
    setEditWsName(ws.name)
    setEditWsType(ws.type || 'other')
  }

  const handleSaveEditWs = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingWs || !editWsName.trim()) return
    setSavingEdit(true)
    try {
      await LocalDB.updateWorkspace(editingWs.id, editWsName.trim(), editWsType)
      toast.success('Espacio actualizado con éxito')
      setEditingWs(null)
      await loadDashboardData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar el espacio')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleConfirmDeleteWs = async () => {
    if (!deletingWs) return
    setDeletingLoading(true)
    try {
      await LocalDB.deleteWorkspace(deletingWs.id)
      toast.success(`Espacio "${deletingWs.name}" eliminado`)
      setDeletingWs(null)
      await loadDashboardData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el espacio')
    } finally {
      setDeletingLoading(false)
    }
  }

  const [mergingWs, setMergingWs] = useState(false)
  const handleMergeAccidentalWorkspace = async (sourceWsId: string) => {
    setMergingWs(true)
    try {
      const count = await LocalDB.mergeWorkspaceInto(sourceWsId, activeWsId)
      toast.success(`Se unificaron ${count} movimientos en este espacio y se limpió el espacio duplicado.`)
      await loadDashboardData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al unificar espacio')
    } finally {
      setMergingWs(false)
    }
  }

  const switchWorkspace = (id: string) => {
    if (id === activeWsId) return
    LocalDB.setActiveWorkspaceId(id) // dispara recarga vía evento
  }

  // --- Layout arrastrable del dashboard ---
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER)
  const [editingLayout, setEditingLayout] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('dash_order') || '[]')
      if (Array.isArray(saved) && saved.length) {
        const merged = [...saved.filter((x: string) => DEFAULT_ORDER.includes(x)), ...DEFAULT_ORDER.filter((x) => !saved.includes(x))]
        setOrder(merged)
      }
    } catch {}
  }, [])

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (over && active.id !== over.id) {
      setOrder((prev) => {
        const next = arrayMove(prev, prev.indexOf(active.id as string), prev.indexOf(over.id as string))
        try { localStorage.setItem('dash_order', JSON.stringify(next)) } catch {}
        return next
      })
    }
  }


  useEffect(() => {
    loadDashboardData()

    window.addEventListener('finanzas_data_changed', loadDashboardData)
    return () => {
      window.removeEventListener('finanzas_data_changed', loadDashboardData)
    }
  }, [])

  // --- COMPUTACIONES HISTÓRICAS GENERALES (TODO EL ESPACIO) ---
  const allTimeIncome = transactions
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const allTimeExpense = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const allTimeNetBalance = allTimeIncome - allTimeExpense

  // --- COMPUTACIONES DE ESTADÍSTICAS DEL MES ACTUAL ---
  const today = new Date()
  const currentMonthKey = today.toISOString().substring(0, 7) // YYYY-MM

  const currentMonthTxs = transactions.filter(tx => tx.date.startsWith(currentMonthKey))

  const totalIncome = currentMonthTxs
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const totalExpense = currentMonthTxs
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const netBalance = totalIncome - totalExpense

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0

  // Obtener los presupuestos con su gasto actual (con rollup de subcategorías)
  const budgetOverviews = budgets.map(b => {
    const category = categories.find(c => c.id === b.category_id)
    const childIds = categories.filter(c => c.parent_id === b.category_id).map(c => c.id)
    const categoryIdsToSum = [b.category_id, ...childIds]

    const spent = currentMonthTxs
      .filter(tx => categoryIdsToSum.includes(tx.category_id) && tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0)
    
    return {
      ...b,
      categoryName: category ? category.name : 'Desconocido',
      spent,
      percent: b.amount > 0 ? (spent / b.amount) * 100 : 0
    }
  })

  // Obtener las últimas 5 transacciones
  const recentTxs = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  // --- COMPARACIÓN CON EL MES ANTERIOR ---
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const prevMonthKey = prevMonthDate.toISOString().substring(0, 7)
  const prevMonthTxs = transactions.filter((tx) => tx.date.startsWith(prevMonthKey))
  const prevIncome = prevMonthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const prevExpense = prevMonthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const pctDelta = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null)
  const incomeDelta = pctDelta(totalIncome, prevIncome)
  const expenseDelta = pctDelta(totalExpense, prevExpense)

  // Categoría de mayor gasto del mes (subcategorías suman a su categoría padre)
  const expenseByCat = new Map<string, number>()
  currentMonthTxs.filter((t) => t.type === 'expense').forEach((t) => {
    const cat = categories.find((c) => c.id === t.category_id)
    const rootId = cat?.parent_id || t.category_id
    expenseByCat.set(rootId, (expenseByCat.get(rootId) || 0) + t.amount)
  })
  let topCat: { name: string; amount: number } | null = null
  for (const [cid, amt] of expenseByCat) {
    if (!topCat || amt > topCat.amount) {
      topCat = { name: categories.find((c) => c.id === cid)?.name || 'Sin categoría', amount: amt }
    }
  }

  // Alertas de presupuesto
  const overBudget = budgetOverviews.filter((b) => b.amount > 0 && b.spent > b.amount)
  const closeBudget = budgetOverviews.filter((b) => b.amount > 0 && b.percent >= 80 && b.spent <= b.amount)

  // Formato compacto de porcentaje de cambio
  const DeltaBadge = ({ delta, invert = false }: { delta: number | null; invert?: boolean }) => {
    if (delta === null) return <span className="text-[10px] text-slate-500">sin dato previo</span>
    const up = delta >= 0
    const good = invert ? !up : up
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${good ? 'text-emerald-400' : 'text-rose-400'}`}>
        {up ? <FiArrowUpRight className="w-3 h-3" /> : <FiArrowDownRight className="w-3 h-3" />}
        {Math.abs(delta).toFixed(0)}% vs mes anterior
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <svg className="animate-spin h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )
  }

  // Pronóstico de flujo (fin de mes): balance actual + recurrentes por venir este mes
  const monthEndStr = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
  const nowStr = today.toISOString().split('T')[0]
  const upcomingRec = allRecurring.filter((r) => r.active && r.next_date > nowStr && r.next_date <= monthEndStr)
  const upIncome = upcomingRec.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const upExpense = upcomingRec.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
  const projectedEom = netBalance + upIncome - upExpense

  const widgetNodes: Record<string, React.ReactNode> = {
    metrics: (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 rounded-md p-4 sm:p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Saldo Neto General</span>
              <p className={`text-lg sm:text-xl font-extrabold mt-1.5 truncate ${allTimeNetBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${allTimeNetBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-10 h-10 bg-slate-800/50 rounded-md flex items-center justify-center flex-shrink-0 ml-2">
              <img src="/icons/gold-ingots.png" alt="" className="w-6 h-6 object-contain" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2.5 font-semibold">Total histórico acumulado</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-md p-4 sm:p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Balance del Mes</span>
              <p className={`text-lg sm:text-xl font-extrabold mt-1.5 truncate ${netBalance >= 0 ? 'text-teal-400' : 'text-amber-400'}`}>
                ${netBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-10 h-10 bg-slate-800/50 rounded-md flex items-center justify-center flex-shrink-0 ml-2">
              <img src="/icons/wallet.png" alt="" className="w-6 h-6 object-contain" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2.5 font-semibold">Diferencia neta mensual</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-md p-4 sm:p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Ingresos del Mes</span>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-400 mt-1.5 truncate">
                ${totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-10 h-10 bg-slate-800/50 rounded-md flex items-center justify-center flex-shrink-0 ml-2">
              <img src="/icons/money-flow.png" alt="" className="w-6 h-6 object-contain" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2.5 font-semibold">Total bruto recibido</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-md p-4 sm:p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Gastos del Mes</span>
              <p className="text-lg sm:text-xl font-extrabold text-rose-400 mt-1.5 truncate">
                ${totalExpense.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-10 h-10 bg-slate-800/50 rounded-md flex items-center justify-center flex-shrink-0 ml-2">
              <img src="/icons/invoice.png" alt="" className="w-6 h-6 object-contain" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2.5 font-semibold">Total gastado mensual</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-md p-4 sm:p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">Tasa de Ahorro</span>
              <p className="text-lg sm:text-xl font-extrabold text-blue-400 mt-1.5 truncate">
                {savingsRate >= 0 ? `${savingsRate.toFixed(1)}%` : '0.0%'}
              </p>
            </div>
            <div className="w-10 h-10 bg-slate-800/50 rounded-md flex items-center justify-center flex-shrink-0 ml-2">
              <img src="/icons/forecast.png" alt="" className="w-6 h-6 object-contain" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2.5 font-semibold">Proporción de ahorro</p>
        </div>
      </div>
    ),
    summary: (
      <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-4">Resumen del Mes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Ingresos</span>
            <p className="text-lg font-extrabold text-slate-100">${totalIncome.toLocaleString('es-ES')}</p>
            <DeltaBadge delta={incomeDelta} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Gastos</span>
            <p className="text-lg font-extrabold text-slate-100">${totalExpense.toLocaleString('es-ES')}</p>
            <DeltaBadge delta={expenseDelta} invert />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Mayor gasto</span>
            {topCat ? (
              <>
                <p className="text-lg font-extrabold text-slate-100 truncate">{topCat.name}</p>
                <span className="text-[10px] font-bold text-rose-400">${topCat.amount.toLocaleString('es-ES')}</span>
              </>
            ) : (
              <p className="text-xs text-slate-500 italic mt-1">Sin gastos este mes</p>
            )}
          </div>
        </div>
      </div>
    ),
    forecast: (
      <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <img src="/icons/forecast.png" alt="" className="w-8 h-8 object-contain" />
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Pronóstico de Flujo</h3>
            <p className="text-[10px] text-slate-500">Proyección al fin de mes con tus recurrentes.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Balance actual</span>
            <p className={`text-lg font-extrabold ${netBalance >= 0 ? 'text-teal-400' : 'text-amber-400'}`}>${netBalance.toLocaleString('es-ES')}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Recurrentes por venir</span>
            <p className="text-xs font-bold text-emerald-400">+${upIncome.toLocaleString('es-ES')}</p>
            <p className="text-xs font-bold text-rose-400">−${upExpense.toLocaleString('es-ES')}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Proyección fin de mes</span>
            <p className={`text-lg font-extrabold ${projectedEom >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>${projectedEom.toLocaleString('es-ES')}</p>
          </div>
        </div>
        {upcomingRec.length === 0 && (
          <p className="text-[10px] text-slate-500 mt-3 italic">No hay recurrentes pendientes este mes. La proyección iguala tu balance actual.</p>
        )}
      </div>
    ),
    charts: <DashboardCharts transactions={transactions} categories={categories} />,
    budgets: (
      <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-md">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Metas de Presupuesto</h3>
          <Link href="/budgets" className="text-[10px] font-semibold text-emerald-450 hover:underline">Gestionar</Link>
        </div>
        <div className="space-y-3.5">
          {budgetOverviews.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              <p className="italic">No has fijado presupuestos todavía.</p>
              <Link href="/budgets" className="inline-block mt-3 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-md font-bold hover:bg-slate-800 text-emerald-500 text-[10px]">Establecer Presupuesto</Link>
            </div>
          ) : (
            budgetOverviews.slice(0, 6).map((b) => {
              const percent = Math.min(b.percent, 100)
              const isOverBudget = b.spent > b.amount
              const isClose = b.percent >= 80 && !isOverBudget
              let barColor = 'bg-emerald-500'
              let textColor = 'text-emerald-400'
              if (isOverBudget) { barColor = 'bg-red-500'; textColor = 'text-red-400 font-bold' }
              else if (isClose) { barColor = 'bg-amber-500'; textColor = 'text-amber-400' }
              return (
                <div key={b.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-slate-300">
                    <span>{b.categoryName}</span>
                    <span className={textColor}>${b.spent.toLocaleString()} / <span className="text-slate-500">${b.amount.toLocaleString()}</span></span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                    <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    ),
    activity: (
      <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-md">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Actividad Reciente</h3>
          <Link href="/transactions" className="text-[10px] font-semibold text-emerald-450 hover:underline">Ver Todas</Link>
        </div>
        {recentTxs.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs italic">No hay transacciones registradas.</div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {recentTxs.map((tx) => {
              const category = categories.find((c) => c.id === tx.category_id)
              const isIncome = tx.type === 'income'
              return (
                <div key={tx.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black ${isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{isIncome ? '+' : '−'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-100 truncate leading-tight">{tx.description}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{category ? category.name : 'Sin categoría'} · {new Date(tx.date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</p>
                  </div>
                  <span className={`text-xs font-extrabold whitespace-nowrap ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>{isIncome ? '+' : '-'}${Math.abs(tx.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    ),
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Título de la página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
            <img src="/icons/report.png" alt="" className="w-7 h-7 object-contain" />
            Mi Control Financiero
          </h1>
          <p className="text-slate-400 text-xs mt-1">Resumen general y estadísticas de tus movimientos del mes.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setEditingLayout((v) => !v)}
            className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-md font-bold text-xs border transition-all cursor-pointer ${editingLayout ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
          >
            {editingLayout ? <><FiCheck className="w-4 h-4" /> Listo</> : <><FiMove className="w-4 h-4" /> Editar diseño</>}
          </button>
        </div>
      </div>

      {/* BANNER: ESPACIOS ACCIDENTALES QUE PUEDEN UNIFICARSE (EJ. Cash) */}
      {(() => {
        const activeWs = overview.find((w) => w.id === activeWsId) || overview[0]
        const accidentalWs = overview.filter(
          (w) => w.id !== activeWs?.id && ['cash', 'efectivo'].includes(w.name.trim().toLowerCase())
        )
        if (!accidentalWs.length) return null

        return (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FiRefreshCw className="w-4 h-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-amber-300">
                  {`Unificar espacio "${accidentalWs[0].name}" en ${activeWs?.name || 'tu espacio principal'}`}
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  Detectamos el espacio <strong>{accidentalWs[0].name}</strong> creado por separado. Puedes mover todos sus movimientos a <strong>{activeWs?.name}</strong> con el bolsillo <em>&ldquo;{accidentalWs[0].name}&rdquo;</em> y eliminar el espacio duplicado.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={mergingWs}
              onClick={() => handleMergeAccidentalWorkspace(accidentalWs[0].id)}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <FiCheck className="w-3.5 h-3.5" />
              {mergingWs ? 'Unificando...' : `Unificar a ${activeWs?.name || 'este espacio'}`}
            </button>
          </div>
        )
      })()}

      {/* SECCIÓN: MIS ESPACIOS */}
      {overview.length > 0 && (
        <details open className="group bg-slate-900 border border-slate-800 rounded-md shadow-sm overflow-hidden">
          <summary className="list-none cursor-pointer px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-850/40 transition-colors border-b border-transparent group-open:border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <FiUsers className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100 tracking-wide">
                    Mis Espacios
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    {overview.length}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Administra y alterna entre tus espacios financieros independientes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setIsAddAccountOpen(true); }}
                className="inline-flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-all cursor-pointer shadow-xs"
              >
                <FiPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nuevo Espacio</span>
              </button>
              <div className="w-7 h-7 rounded-md bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-slate-200 transition-colors">
                <FiChevronDown className="w-4 h-4 transition-transform duration-200 group-open:rotate-180" />
              </div>
            </div>
          </summary>

          <div className="px-5 pb-5 pt-1 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {overview.map((w) => {
                const meta = getWorkspaceAccountMeta(w.name, w.type)
                const Icon = meta.Icon
                const isActive = w.id === activeWsId

                return (
                  <div
                    key={w.id}
                    onClick={() => switchWorkspace(w.id)}
                    className={`bg-slate-950 border rounded-md p-4 flex flex-col justify-between transition-all cursor-pointer group ${
                      isActive ? 'border-emerald-500 ring-1 ring-emerald-500/30 shadow-xs' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Cabecera del espacio con icono y nombre en ancho completo */}
                      <div className="flex items-start gap-3 mb-3">
                        <span className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 border ${meta.colorClass}`}>
                          <Icon className="w-5 h-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-100 break-words leading-tight group-hover:text-white">
                            {w.name}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-1">
                            {meta.label} · {w.isOwner ? 'Dueño' : 'Compartido'}
                          </p>
                        </div>
                      </div>

                      {/* Barra de botones de acción del espacio */}
                      <div className="flex items-center justify-between gap-1.5 mb-3 pt-2 border-t border-slate-900">
                        <div className="flex items-center gap-1">
                          {w.isOwner && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); openEditModal(w); }}
                                className="text-[10px] font-semibold text-slate-400 hover:text-amber-400 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 px-2 py-1 rounded transition-all flex items-center gap-1 cursor-pointer"
                                title="Editar nombre y tipo de espacio"
                              >
                                <FiEdit2 className="w-3 h-3" />
                                <span>Editar</span>
                              </button>
                              {overview.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setDeletingWs(w); }}
                                  className="text-[10px] font-semibold text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/40 p-1 rounded transition-all flex items-center gap-1 cursor-pointer"
                                  title="Eliminar este espacio"
                                >
                                  <FiTrash2 className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); openShareModalForWs(w); }}
                                className="text-[10px] font-semibold text-slate-400 hover:text-emerald-400 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 px-2 py-1 rounded transition-all flex items-center gap-1 cursor-pointer"
                                title="Compartir este espacio"
                              >
                                <FiUsers className="w-3 h-3 text-emerald-500" />
                                <span>Compartir</span>
                              </button>
                            </>
                          )}
                          {!w.isOwner && (
                            <span className="text-[9px] font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                              <FiUsers className="w-2.5 h-2.5" /> Compartida
                            </span>
                          )}
                        </div>

                        {isActive ? (
                          <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase shrink-0">
                            Activo
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-slate-900 group-hover:bg-slate-850 border border-slate-800 text-slate-400 group-hover:text-slate-200 px-2.5 py-1 rounded transition-colors shrink-0">
                            Abrir
                          </span>
                        )}
                      </div>

                      {/* Balance global del mes */}
                      <div className="bg-slate-900/80 border border-slate-850 rounded p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Balance del Mes</span>
                          <span className={`text-base font-extrabold ${w.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${w.net.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-800/60">
                          <span>Ingresos: <strong className="text-slate-300">+${w.income.toLocaleString('es-ES')}</strong></span>
                          <span>Gastos: <strong className="text-slate-300">-${w.expense.toLocaleString('es-ES')}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </details>
      )}

      {/* MODAL: COMPARTIR CUENTA / ESPACIO */}
      {sharingWs && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-md p-6 shadow-md relative animate-fadeIn">
            <button
              onClick={() => { setSharingWs(null); setSharingMembers([]); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-8 h-8 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <FiUsers className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-md font-bold text-slate-100 leading-tight">
                  Compartir cuenta: <span className="text-emerald-400">{sharingWs.name}</span>
                </h2>
                <p className="text-[10px] text-slate-400">Acceso compartido en tiempo real</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Vincula a otra persona por su correo (ej. pareja, socio o familiar). Ambos usuarios podrán ver el balance, consultar movimientos y registrar nuevos ingresos y gastos en tiempo real.
            </p>

            <form onSubmit={handleAddMemberToWs} className="flex gap-2 mb-4">
              <input
                type="email"
                required
                placeholder="correo@ejemplo.com"
                value={sharingMemberEmail}
                onChange={(e) => setSharingMemberEmail(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all"
                autoFocus
              />
              <button
                type="submit"
                disabled={sharingAdding}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <FiPlus className="w-3.5 h-3.5" /> {sharingAdding ? 'Vinculando...' : 'Invitar'}
              </button>
            </form>

            <div className="space-y-2 mb-4">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Personas con acceso ({sharingMembers.length})
              </label>

              {sharingMembersLoading ? (
                <p className="text-xs text-slate-500 text-center py-3 bg-slate-950 rounded border border-slate-850">Cargando miembros...</p>
              ) : sharingMembers.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-3 bg-slate-950 rounded border border-slate-850">
                  Esta cuenta aún es privada (solo tú tienes acceso).
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {sharingMembers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span className="text-xs text-slate-200 truncate">{m.invited_email}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveMemberFromWs(m.id)}
                        title="Revocar acceso"
                        className="p-1 text-slate-500 hover:text-rose-400 transition-all cursor-pointer flex-shrink-0"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="text-[11px] font-semibold text-slate-400 hover:text-emerald-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FiCopy className="w-3.5 h-3.5" /> Copiar enlace de inicio de sesión
              </button>
              <button
                type="button"
                onClick={() => { setSharingWs(null); setSharingMembers([]); }}
                className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded text-xs font-semibold transition-all cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR NUEVA CUENTA / BOLSILLO */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-md p-6 shadow-md relative animate-fadeIn">
            <button
              onClick={() => { setIsAddAccountOpen(false); setNewAccountName(''); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <h2 className="text-md font-bold text-slate-100 mb-1">Crear Nuevo Espacio</h2>
            <p className="text-xs text-slate-400 mb-4">
              Crea un espacio independiente para organizar tus ingresos, gastos y presupuestos de forma separada (ej. Finanzas Personales, Negocio, Hogar).
            </p>

            {/* Accesos rápidos a espacios sugeridos */}
            <div className="mb-4">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Sugerencias Populares (1 Clic)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Finanzas Personales',
                  'Negocio / Empresa',
                  'Hogar y Familia',
                  'Inversiones',
                  'Viajes / Proyectos'
                ].map((preset) => {
                  const meta = getWorkspaceAccountMeta(preset)
                  const PresetIcon = meta.Icon
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleCreateQuickAccount(preset)}
                      className="text-xs font-semibold bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <PresetIcon className="w-3 h-3 text-emerald-400" />
                      {preset}
                    </button>
                  )
                })}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleCreateQuickAccount(newAccountName, newAccountType)
              }}
              className="space-y-4 pt-2 border-t border-slate-800"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nombre del Espacio</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Finanzas Personales, Mi Negocio, Pareja..."
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tipo de Espacio</label>
                <div className="grid grid-cols-2 gap-2">
                  {WS_TYPES.map((t) => {
                    const selected = newAccountType === t.value
                    const Icon = t.Icon
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setNewAccountType(t.value)}
                        className={`flex items-start gap-2 p-2.5 rounded-md border text-left transition-all cursor-pointer ${
                          selected
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                        }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${selected ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span className="min-w-0">
                          <span className={`block text-xs font-bold ${selected ? 'text-emerald-400' : 'text-slate-200'}`}>{t.label}</span>
                          <span className="block text-[10px] text-slate-500 leading-tight">{t.hint}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setIsAddAccountOpen(false); setNewAccountName(''); }}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-md text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingAccount}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {creatingAccount ? 'Creando...' : 'Crear Espacio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR ESPACIO */}
      {editingWs && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-md p-6 shadow-md relative animate-fadeIn">
            <button
              onClick={() => setEditingWs(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <h2 className="text-md font-bold text-slate-100 mb-1 flex items-center gap-2">
              <FiEdit2 className="w-4 h-4 text-amber-400" />
              Editar Espacio
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Modifica el nombre y el tipo de este espacio para mantener tus finanzas organizadas.
            </p>

            <form onSubmit={handleSaveEditWs} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nombre del Espacio</label>
                <input
                  type="text"
                  required
                  value={editWsName}
                  onChange={(e) => setEditWsName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tipo de Cuenta / Espacio</label>
                <div className="grid grid-cols-2 gap-2">
                  {WS_TYPES.map((t) => {
                    const selected = editWsType === t.value
                    const Icon = t.Icon
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setEditWsType(t.value)}
                        className={`flex items-start gap-2 p-2.5 rounded-md border text-left transition-all cursor-pointer ${
                          selected
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                        }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${selected ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span className="min-w-0">
                          <span className={`block text-xs font-bold ${selected ? 'text-emerald-400' : 'text-slate-200'}`}>{t.label}</span>
                          <span className="block text-[10px] text-slate-500 leading-tight">{t.hint}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingWs(null)}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-md text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || !editWsName.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ELIMINAR ESPACIO */}
      {deletingWs && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 w-full max-w-md rounded-md p-6 shadow-md relative animate-fadeIn">
            <button
              onClick={() => setDeletingWs(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-9 h-9 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
                <FiTrash2 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-md font-bold text-slate-100 leading-tight">
                  Eliminar Espacio
                </h2>
                <p className="text-xs text-rose-400 font-semibold">{deletingWs.name}</p>
              </div>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 rounded p-3 my-4">
              <p className="text-xs text-slate-200 leading-relaxed">
                ¿Estás seguro de que deseas eliminar permanentemente el espacio <strong className="text-white font-bold">{deletingWs.name}</strong>?
              </p>
              <p className="text-[11px] text-rose-300/90 mt-1.5 leading-normal">
                ⚠️ Se eliminarán todas las transacciones, categorías, presupuestos y miembros asociados a este espacio. Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingWs(null)}
                className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-md text-xs font-semibold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteWs}
                disabled={deletingLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
                {deletingLoading ? 'Eliminando...' : 'Sí, Eliminar Espacio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BANNER: recurrentes pendientes por confirmar */}
      {dueRecurring.length > 0 && (
        <Link
          href="/recurring"
          className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/30 rounded-md px-4 py-3 hover:bg-amber-500/10 transition-all"
        >
          <FiRepeat className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="text-xs text-slate-200 font-semibold">
            Tienes <span className="text-amber-400 font-bold">{dueRecurring.length}</span> {dueRecurring.length === 1 ? 'transacción recurrente' : 'transacciones recurrentes'} por confirmar.
          </span>
          <span className="ml-auto text-[10px] font-bold text-amber-400">Revisar →</span>
        </Link>
      )}

      {/* BANNER: presupuestos excedidos / cerca del límite */}
      {(overBudget.length > 0 || closeBudget.length > 0) && (
        <Link
          href="/budgets"
          className="flex items-center gap-3 bg-rose-500/5 border border-rose-500/30 rounded-md px-4 py-3 hover:bg-rose-500/10 transition-all"
        >
          <FiAlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span className="text-xs text-slate-200 font-semibold">
            {overBudget.length > 0 && (
              <span><span className="text-rose-400 font-bold">{overBudget.length}</span> {overBudget.length === 1 ? 'presupuesto excedido' : 'presupuestos excedidos'}</span>
            )}
            {overBudget.length > 0 && closeBudget.length > 0 && <span> · </span>}
            {closeBudget.length > 0 && (
              <span><span className="text-amber-400 font-bold">{closeBudget.length}</span> cerca del límite</span>
            )}
          </span>
          <span className="ml-auto text-[10px] font-bold text-rose-400">Ver →</span>
        </Link>
      )}

      {editingLayout && (
        <p className="text-[10px] text-emerald-400 font-semibold">Arrastra las tarjetas por el asa para reordenar. Se guarda automáticamente.</p>
      )}

      {/* WIDGETS ARRASTRABLES */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            {order.map((id) =>
              widgetNodes[id] ? (
                <SortableWidget key={id} id={id} editing={editingLayout}>
                  {widgetNodes[id]}
                </SortableWidget>
              ) : null
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
