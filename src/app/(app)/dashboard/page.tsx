'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LocalDB } from '@/lib/db'
import { Transaction, Category, Budget, RecurringTransaction, Workspace } from '@/types'
import DashboardCharts from '@/components/DashboardCharts'
import { wsTypeMeta } from '@/lib/workspaceMeta'
import {
  FiTrendingUp,
  FiTrendingDown,
  FiCreditCard,
  FiPercent,
  FiPlus,
  FiRepeat,
  FiArrowUpRight,
  FiArrowDownRight,
  FiAlertTriangle
} from 'react-icons/fi'

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [dueRecurring, setDueRecurring] = useState<RecurringTransaction[]>([])
  const [overview, setOverview] = useState<(Workspace & { isOwner: boolean; income: number; expense: number; net: number })[]>([])
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
    // Panel de espacios de trabajo
    try {
      setOverview(await LocalDB.getWorkspacesOverview())
    } catch {
      setOverview([])
    }
    // Recurrentes pendientes (tabla opcional: no romper si aún no existe)
    try {
      setDueRecurring(await LocalDB.getDueRecurring())
    } catch {
      setDueRecurring([])
    }
  }

  const switchWorkspace = (id: string) => {
    if (id === activeWsId) return
    LocalDB.setActiveWorkspaceId(id) // dispara recarga vía evento
  }

  useEffect(() => {
    loadDashboardData()

    window.addEventListener('finanzas_data_changed', loadDashboardData)
    return () => {
      window.removeEventListener('finanzas_data_changed', loadDashboardData)
    }
  }, [])

  // --- COMPUTCIONES DE ESTADÍSTICAS DEL MES ACTUAL ---
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

  // Obtener los presupuestos con su gasto actual
  const budgetOverviews = budgets.map(b => {
    const category = categories.find(c => c.id === b.category_id)
    const spent = currentMonthTxs
      .filter(tx => tx.category_id === b.category_id && tx.type === 'expense')
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

  // Categoría de mayor gasto del mes
  const expenseByCat = new Map<string, number>()
  currentMonthTxs.filter((t) => t.type === 'expense').forEach((t) => {
    expenseByCat.set(t.category_id, (expenseByCat.get(t.category_id) || 0) + t.amount)
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Título de la página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Mi Control Financiero</h1>
          <p className="text-slate-400 text-xs mt-1">Resumen general y estadísticas de tus movimientos del mes.</p>
        </div>
        <Link
          href="/transactions"
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-md font-bold text-xs transition-all duration-150 active:scale-[0.99]"
        >
          <FiPlus className="w-4 h-4" />
          Nueva Transacción
        </Link>
      </div>

      {/* MIS ESPACIOS DE TRABAJO */}
      {overview.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-3">Mis Espacios de Trabajo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {overview.map((w) => {
              const meta = wsTypeMeta(w.type)
              const Icon = meta.Icon
              const isActive = w.id === activeWsId
              return (
                <button
                  key={w.id}
                  onClick={() => switchWorkspace(w.id)}
                  className={`text-left bg-slate-900 border rounded-md p-4 transition-all cursor-pointer ${
                    isActive ? 'border-emerald-500' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-100 truncate leading-tight">{w.name}</p>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                        {meta.label} · {w.isOwner ? 'Dueño' : 'Compartido'}
                      </p>
                    </div>
                    {isActive && <span className="ml-auto text-[9px] font-bold text-emerald-400 uppercase">Activo</span>}
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-[10px] text-slate-500 font-semibold">Balance del mes</span>
                    <span className={`text-sm font-extrabold ${w.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${w.net.toLocaleString('es-ES')}
                    </span>
                  </div>
                </button>
              )
            })}
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

      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Ingresos */}
        <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ingresos del Mes</span>
              <p className="text-xl font-extrabold text-emerald-400 mt-1.5">
                ${totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-9 h-9 bg-emerald-500/10 text-emerald-400 rounded-md flex items-center justify-center">
              <FiTrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-semibold">Total bruto recibido</p>
        </div>

        {/* Card Gastos */}
        <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gastos del Mes</span>
              <p className="text-xl font-extrabold text-rose-400 mt-1.5">
                ${totalExpense.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-9 h-9 bg-rose-500/10 text-rose-400 rounded-md flex items-center justify-center">
              <FiTrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-semibold">Total gastado acumulado</p>
        </div>

        {/* Card Balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Balance de Caja</span>
              <p className={`text-xl font-extrabold mt-1.5 ${netBalance >= 0 ? 'text-teal-400' : 'text-amber-400'}`}>
                ${netBalance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className={`w-9 h-9 rounded-md flex items-center justify-center ${netBalance >= 0 ? 'bg-teal-500/10 text-teal-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <FiCreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-semibold">Diferencia neta</p>
        </div>

        {/* Card Tasa de Ahorro */}
        <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tasa de Ahorro</span>
              <p className="text-xl font-extrabold text-blue-400 mt-1.5">
                {savingsRate >= 0 ? `${savingsRate.toFixed(1)}%` : '0.0%'}
              </p>
            </div>
            <div className="w-9 h-9 bg-blue-500/10 text-blue-400 rounded-md flex items-center justify-center">
              <FiPercent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-3 font-semibold">Proporción de ahorro</p>
        </div>
      </div>

      {/* RESUMEN DEL MES (comparación mes a mes) */}
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

      {/* GRÁFICOS INTERACTIVOS */}
      <DashboardCharts transactions={transactions} categories={categories} />

      {/* COLUMNAS: PRESUPUESTOS Y ÚLTIMAS TRANSACCIONES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Presupuestos */}
        <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-md lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Metas de Presupuesto</h3>
              <Link href="/budgets" className="text-[10px] font-semibold text-emerald-450 hover:underline">
                Gestionar
              </Link>
            </div>

            <div className="space-y-3.5">
              {budgetOverviews.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  <p className="italic">No has fijado presupuestos todavía.</p>
                  <Link href="/budgets" className="inline-block mt-3 px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-md font-bold hover:bg-slate-900 text-emerald-500 text-[10px]">
                    Establecer Presupuesto
                  </Link>
                </div>
              ) : (
                budgetOverviews.slice(0, 4).map((b) => {
                  const percent = Math.min(b.percent, 100)
                  const isOverBudget = b.spent > b.amount
                  const isClose = b.percent >= 80 && !isOverBudget
                  
                  let barColor = 'bg-emerald-500'
                  let textColor = 'text-emerald-400'
                  if (isOverBudget) {
                    barColor = 'bg-red-500'
                    textColor = 'text-red-400 font-bold'
                  } else if (isClose) {
                    barColor = 'bg-amber-500'
                    textColor = 'text-amber-400'
                  }

                  return (
                    <div key={b.id} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-slate-350">
                        <span>{b.categoryName}</span>
                        <span className={textColor}>
                          ${b.spent.toLocaleString()} / <span className="text-slate-500">${b.amount.toLocaleString()}</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                        <div
                          className={`h-full rounded-full transition-all duration-550 ${barColor}`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Últimas Transacciones */}
        <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-md lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Actividad Reciente</h3>
              <Link href="/transactions" className="text-[10px] font-semibold text-emerald-450 hover:underline">
                Ver Todas
              </Link>
            </div>

            <div className="overflow-x-auto">
              {recentTxs.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs italic">
                  No hay transacciones registradas.
                </div>
              ) : (
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-[9px] uppercase font-bold tracking-wider text-left">
                      <th className="pb-2.5">Fecha</th>
                      <th className="pb-2.5">Descripción</th>
                      <th className="pb-2.5">Categoría</th>
                      <th className="pb-2.5 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {recentTxs.map((tx) => {
                      const category = categories.find(c => c.id === tx.category_id)
                      const isIncome = tx.type === 'income'
                      return (
                        <tr key={tx.id} className="hover:bg-slate-850/10">
                          <td className="py-3 text-slate-400 font-medium whitespace-nowrap">
                            {new Date(tx.date).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short'
                            })}
                          </td>
                          <td className="py-3 font-semibold text-slate-200">{tx.description}</td>
                          <td className="py-3">
                            <span className="inline-block px-2 py-0.5 bg-slate-950 text-slate-450 rounded-md text-[10px] border border-slate-850">
                              {category ? category.name : 'Sin Categoría'}
                            </span>
                          </td>
                          <td className={`py-3 text-right font-bold whitespace-nowrap ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isIncome ? '+' : '-'}${Math.abs(tx.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
