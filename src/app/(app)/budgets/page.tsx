'use client'

import { useState, useEffect } from 'react'
import { LocalDB } from '@/lib/db'
import { Category, Budget, Transaction } from '@/types'
import { toast } from 'react-hot-toast'
import { FiEdit, FiPlus, FiX } from 'react-icons/fi'

export default function BudgetsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  // Modal de configuración
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [budgetAmount, setBudgetAmount] = useState('')

  const loadData = async () => {
    try {
      const cats = await LocalDB.getCategories()
      const bud = await LocalDB.getBudgets()
      const txs = await LocalDB.getTransactions()
      setCategories(cats)
      setBudgets(bud)
      setTransactions(txs)
    } catch (e) {
      console.error('Error cargando presupuestos', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    window.addEventListener('finanzas_data_changed', loadData)
    return () => window.removeEventListener('finanzas_data_changed', loadData)
  }, [])

  // Filtrar categorías de tipo "expense" (gastos)
  const expenseCategories = categories.filter((c) => c.type === 'expense')

  // Obtener mes actual
  const today = new Date()
  const currentMonthKey = today.toISOString().substring(0, 7) // YYYY-MM
  const currentMonthExpenses = transactions.filter(
    (tx) => tx.type === 'expense' && tx.date.startsWith(currentMonthKey)
  )

  // Armar lista extendida de presupuestos por categoría
  const budgetsList = expenseCategories.map((cat) => {
    const budget = budgets.find((b) => b.category_id === cat.id)
    const spent = currentMonthExpenses
      .filter((tx) => tx.category_id === cat.id)
      .reduce((sum, tx) => sum + tx.amount, 0)
    
    return {
      category: cat,
      budgetAmount: budget ? budget.amount : 0,
      budgetId: budget ? budget.id : null,
      spent,
      percent: budget && budget.amount > 0 ? (spent / budget.amount) * 100 : 0
    }
  })

  // Estadísticas globales del mes
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0)
  
  // Suma de lo gastado únicamente en las categorías con presupuesto asignado
  const totalSpentInBudgets = budgetsList
    .filter((b) => b.budgetAmount > 0)
    .reduce((sum, b) => sum + b.spent, 0)

  const globalPercent = totalBudgeted > 0 ? (totalSpentInBudgets / totalBudgeted) * 100 : 0

  // Abrir modal de edición
  const handleOpenConfig = (cat: Category, currentAmount: number) => {
    setSelectedCategory(cat)
    setBudgetAmount(currentAmount > 0 ? currentAmount.toString() : '')
    setIsModalOpen(true)
  }

  // Guardar presupuesto
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategory) return

    const amount = parseFloat(budgetAmount)
    if (isNaN(amount) || amount < 0) return

    try {
      if (amount === 0) {
        const budget = budgets.find(b => b.category_id === selectedCategory.id)
        if (budget) {
          await LocalDB.deleteBudget(budget.id)
          toast.success('Presupuesto eliminado')
        }
      } else {
        await LocalDB.saveBudget(selectedCategory.id, amount)
        toast.success('Presupuesto fijado con éxito')
      }
      setIsModalOpen(false)
      setSelectedCategory(null)
      setBudgetAmount('')
    } catch {
      toast.error('Error al guardar presupuesto')
    }
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
      {/* Cabecera */}
      <div>
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">Presupuestos de Gastos</h1>
        <p className="text-slate-400 text-xs mt-1">
          Asigna límites de gastos mensuales a tus categorías y vigila tu progreso en tiempo real.
        </p>
      </div>

      {/* TARJETA DE RESUMEN GLOBAL */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-sm relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Presupuesto Mensual Total</span>
            <p className="text-2xl font-extrabold text-slate-100 mt-1">
              ${totalBudgeted.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gastado en Presupuestos</span>
            <p className="text-2xl font-extrabold text-rose-450 mt-1">
              ${totalSpentInBudgets.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Eficiencia de Gasto</span>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">
              {globalPercent.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Barra de progreso global */}
        {totalBudgeted > 0 && (
          <div className="mt-5 space-y-1.5">
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  globalPercent > 100
                    ? 'bg-rose-500'
                    : globalPercent >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(globalPercent, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 font-semibold">
              <span>0% consumido</span>
              <span>100% límite mensual</span>
            </div>
          </div>
        )}
      </div>

      {/* GRILLA DE PRESUPUESTOS POR CATEGORÍA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgetsList.map((item) => {
          const hasBudget = item.budgetAmount > 0
          const percent = Math.min(item.percent, 100)
          const isOverBudget = item.spent > item.budgetAmount
          const isClose = item.percent >= 80 && !isOverBudget
          
          let cardBorder = 'border-slate-800 hover:border-slate-700'
          let barColor = 'bg-emerald-500'
          let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10'
          let badgeText = 'Saludable'

          if (hasBudget) {
            if (isOverBudget) {
              cardBorder = 'border-red-900/60 bg-red-950/5'
              barColor = 'bg-red-500'
              badgeColor = 'bg-red-500/10 text-red-400 border-red-500/10'
              badgeText = 'Límite Excedido'
            } else if (isClose) {
              cardBorder = 'border-amber-900/60 bg-amber-950/5'
              barColor = 'bg-amber-500'
              badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/10'
              badgeText = 'Cerca del Límite'
            }
          } else {
            badgeColor = 'bg-slate-950 text-slate-500 border-slate-850'
            badgeText = 'Sin Asignar'
          }

          return (
            <div
              key={item.category.id}
              className={`bg-slate-900 border ${cardBorder} rounded-md p-5 shadow-sm flex flex-col justify-between transition-all duration-150`}
            >
              {/* Encabezado de la Tarjeta */}
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm">{item.category.name}</h3>
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold mt-1 border ${badgeColor}`}>
                      {badgeText}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleOpenConfig(item.category, item.budgetAmount)}
                    className="p-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-800 text-emerald-400 rounded-md transition-all cursor-pointer"
                    title={hasBudget ? 'Editar Presupuesto' : 'Fijar Presupuesto'}
                  >
                    {hasBudget ? <FiEdit className="w-3.5 h-3.5" /> : <FiPlus className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Métricas Internas */}
                <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-slate-805 my-3 text-xs font-semibold">
                  <div>
                    <span className="text-[9px] text-slate-550 uppercase tracking-wider block">Gastado</span>
                    <span className={`text-sm font-bold block mt-0.5 ${isOverBudget ? 'text-rose-450' : 'text-slate-200'}`}>
                      ${item.spent.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-550 uppercase tracking-wider block">Límite</span>
                    <span className="text-sm font-bold block mt-0.5 text-slate-350">
                      {hasBudget ? `$${item.budgetAmount.toLocaleString()}` : '--'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Barra de progreso */}
              {hasBudget ? (
                <div className="space-y-1.5 mt-1.5">
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-semibold">
                    <span>Consumido: {item.percent.toFixed(0)}%</span>
                    <span>Disponible: ${(Math.max(0, item.budgetAmount - item.spent)).toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-1 text-[10px] text-slate-500 italic font-medium">
                  Presupuesto no asignado.
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* MODAL CONFIGURACIÓN DE PRESUPUESTO */}
      {isModalOpen && selectedCategory && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-md p-6 shadow-md relative">
            <button
              onClick={() => { setIsModalOpen(false); setSelectedCategory(null); }}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-100"
            >
              <FiX className="w-5 h-5" />
            </button>

            <h2 className="text-md font-bold text-slate-100 mb-1">Fijar Presupuesto Mensual</h2>
            <p className="text-xs text-slate-400 mb-6">
              Establece el límite de gasto para la categoría <span className="text-emerald-500 font-bold">{selectedCategory.name}</span>.
            </p>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Monto de Presupuesto ($)</label>
                <input
                  type="number"
                  required
                  step="1"
                  placeholder="Ej. 500"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all"
                  autoFocus
                />
                <span className="text-[10px] text-slate-500 block mt-1.5 leading-relaxed">
                  Establecer en 0 o dejar vacío para remover el límite de presupuesto.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setSelectedCategory(null); }}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-350 rounded-md text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-all"
                >
                  Guardar Presupuesto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
