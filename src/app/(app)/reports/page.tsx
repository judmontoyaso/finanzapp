'use client'

import { useState, useEffect } from 'react'
import { LocalDB, buildCategoryTree, CategoryNode } from '@/lib/db'
import { Category, Transaction } from '@/types'
import { 
  FiChevronLeft, 
  FiChevronRight, 
  FiTrendingUp, 
  FiTrendingDown, 
  FiChevronDown, 
  FiChevronUp,
  FiActivity
} from 'react-icons/fi'

const COLORS = [
  '#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
]

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

  const loadData = async () => {
    try {
      const txs = await LocalDB.getTransactions()
      const cats = await LocalDB.getCategories()
      setTransactions(txs)
      setCategories(cats)
    } catch {
      console.error('Error cargando datos del reporte')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    window.addEventListener('finanzas_data_changed', loadData)
    return () => window.removeEventListener('finanzas_data_changed', loadData)
  }, [])

  // Cambiar mes
  const adjustMonth = (delta: number) => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  // Filtrar transacciones del mes seleccionado
  const filterTxsByMonth = (txList: Transaction[], date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return txList.filter(tx => {
      const txDate = new Date(tx.date + 'T00:00:00')
      return txDate.getFullYear() === year && txDate.getMonth() === month
    })
  }

  const currentMonthTxs = filterTxsByMonth(transactions, selectedDate)
  
  // Transacciones del mes anterior (para comparación)
  const prevMonthDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1)
  const prevMonthTxs = filterTxsByMonth(transactions, prevMonthDate)

  // Totales del mes
  const totalIncome = currentMonthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0)
  const totalExpense = currentMonthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0)
  const netBalance = totalIncome - totalExpense

  // Agrupar categorías (árbol)
  const expenseCategories = categories.filter(c => c.type === 'expense')
  const rootExpenseCats = buildCategoryTree(expenseCategories)

  // Calcular montos por categoría/subcategoría para el mes actual
  const categoryAmounts: Record<string, number> = {}
  currentMonthTxs.filter(t => t.type === 'expense').forEach(tx => {
    categoryAmounts[tx.category_id] = (categoryAmounts[tx.category_id] || 0) + Number(tx.amount)
  })

  // Calcular montos por categoría/subcategoría para el mes anterior
  const prevCategoryAmounts: Record<string, number> = {}
  prevMonthTxs.filter(t => t.type === 'expense').forEach(tx => {
    prevCategoryAmounts[tx.category_id] = (prevCategoryAmounts[tx.category_id] || 0) + Number(tx.amount)
  })

  // Estructura de datos para mostrar categorías con montos sumados (hijos acumulados en el padre si no se especifica)
  // Pero lo ideal es calcular el monto del padre como la suma de sus transacciones directas + las transacciones de sus hijos.
  const getCatTotal = (node: CategoryNode): number => {
    let total = categoryAmounts[node.id] || 0
    node.children.forEach(child => {
      total += categoryAmounts[child.id] || 0
    })
    return total
  }

  const getPrevCatTotal = (node: CategoryNode): number => {
    let total = prevCategoryAmounts[node.id] || 0
    node.children.forEach(child => {
      total += prevCategoryAmounts[child.id] || 0
    })
    return total
  }

  // Generar datos para la lista de categorías principales con montos
  const expenseReports = rootExpenseCats.map(node => {
    const amount = getCatTotal(node)
    const prevAmount = getPrevCatTotal(node)
    return {
      node,
      amount,
      prevAmount
    }
  }).filter(item => item.amount > 0).sort((a, b) => b.amount - a.amount)

  // Datos para gráfico donut
  const totalChartExpense = expenseReports.reduce((sum, item) => sum + item.amount, 0)
  let accumulatedPercent = 0
  const donutData = expenseReports.map((item, index) => {
    const percentage = totalChartExpense > 0 ? (item.amount / totalChartExpense) * 100 : 0
    const color = COLORS[index % COLORS.length]
    const currentPercent = accumulatedPercent
    accumulatedPercent += percentage
    return {
      name: item.node.name,
      amount: item.amount,
      percentage,
      color,
      startPercent: currentPercent
    }
  })

  const toggleExpand = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }))
  }

  const formatCurrency = (val: number) => {
    return '$' + val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatMonthName = (date: Date) => {
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
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
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Cabecera & Selector de Mes */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
            <img src="/icons/report.png" alt="" className="w-7 h-7 object-contain" />
            Reportes Mensuales
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Analiza el desglose e incremento de tus egresos por categoría y subcategoría.
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-1 self-start sm:self-center">
          <button 
            onClick={() => adjustMonth(-1)} 
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 text-xs font-bold text-slate-200 capitalize min-w-[140px] text-center select-none">
            {formatMonthName(selectedDate)}
          </span>
          <button 
            onClick={() => adjustMonth(1)} 
            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ingresos */}
        <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Ingresos</span>
            <span className="text-lg font-black text-emerald-450 mt-1 block">{formatCurrency(totalIncome)}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <FiTrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Gastos */}
        <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Gastos</span>
            <span className="text-lg font-black text-rose-400 mt-1 block">{formatCurrency(totalExpense)}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <FiTrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Balance Neto */}
        <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Balance Neto</span>
            <span className={`text-lg font-black mt-1 block ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netBalance >= 0 ? '+' : ''}{formatCurrency(netBalance)}
            </span>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${netBalance >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            <FiActivity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sección Gráfico y Detalle */}
      {totalExpense === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-md p-12 text-center text-slate-500">
          <p className="text-xs font-semibold">No se registraron gastos en este mes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Gráfico Donut (custom SVG) */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-md p-5 shadow-md flex flex-col items-center justify-center space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider self-start">Distribución del Gasto</h2>
            
            <div className="relative w-44 h-44">
              <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                {donutData.map((slice, i) => {
                  const r = 45
                  const circumference = 2 * Math.PI * r
                  const strokeDash = (slice.percentage / 100) * circumference
                  const strokeOffset = circumference - (slice.startPercent / 100) * circumference
                  return (
                    <circle
                      key={i}
                      cx="60"
                      cy="60"
                      r={r}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth="15"
                      strokeDasharray={`${strokeDash} ${circumference}`}
                      strokeDashoffset={strokeOffset}
                      className="transition-all duration-500"
                    />
                  )
                })}
                <circle cx="60" cy="60" r="37.5" fill="#0f172a" /> {/* Centro */}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Gastado</span>
                <span className="text-sm font-black text-slate-100">{formatCurrency(totalExpense)}</span>
              </div>
            </div>

            {/* Leyenda */}
            <div className="w-full grid grid-cols-2 gap-2 text-[10px] pt-3 border-t border-slate-800">
              {donutData.slice(0, 10).map((slice, i) => (
                <div key={i} className="flex items-center gap-1.5 overflow-hidden">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }}></span>
                  <span className="text-slate-400 truncate flex-1 leading-tight">{slice.name}</span>
                  <span className="text-slate-200 font-bold">{slice.percentage.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Desglose de Categorías */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-md p-5 shadow-md space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detalle por Categoría</h2>
            
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
              {expenseReports.map(({ node, amount, prevAmount }) => {
                const percent = totalExpense > 0 ? (amount / totalExpense) * 100 : 0
                const isExpanded = !!expandedCategories[node.id]
                
                // Variación mes a mes
                let pctDiff = 0
                let isUp = false
                if (prevAmount > 0) {
                  pctDiff = ((amount - prevAmount) / prevAmount) * 100
                  isUp = amount > prevAmount
                }

                return (
                  <div key={node.id} className="space-y-2 border-b border-slate-800/50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      {/* Título de Categoría */}
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-200 block truncate">{node.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-semibold text-slate-500">{percent.toFixed(1)}% del total</span>
                          
                          {/* Variación MoM */}
                          {prevAmount > 0 && (
                            <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold ${isUp ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {isUp ? <FiTrendingUp className="w-2.5 h-2.5" /> : <FiTrendingDown className="w-2.5 h-2.5" />}
                              {Math.abs(pctDiff).toFixed(0)}% vs mes ant.
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Monto & Botón Expansor */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-black text-slate-100">{formatCurrency(amount)}</span>
                        {node.children && node.children.length > 0 && (
                          <button
                            onClick={() => toggleExpand(node.id)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-100 cursor-pointer"
                          >
                            {isExpanded ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Barra de Progreso */}
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-850">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>

                    {/* Desglose de subcategorías hijas */}
                    {node.children && node.children.length > 0 && isExpanded && (
                      <div className="pl-6 space-y-2 mt-2 bg-slate-950/40 rounded-md p-3 border border-slate-850/50">
                        {node.children
                          .map(child => {
                            const childAmount = categoryAmounts[child.id] || 0
                            return { child, amount: childAmount }
                          })
                          .filter(item => item.amount > 0)
                          .sort((a, b) => b.amount - a.amount)
                          .map(({ child, amount: childAmount }) => {
                            const childPercent = amount > 0 ? (childAmount / amount) * 100 : 0
                            return (
                              <div key={child.id} className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-400 font-medium">{child.name}</span>
                                  <span className="text-slate-300 font-bold">{formatCurrency(childAmount)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-slate-900 rounded-full h-1 overflow-hidden">
                                    <div 
                                      className="bg-emerald-450/70 h-full rounded-full" 
                                      style={{ width: `${childPercent}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-[9px] text-slate-500 font-semibold min-w-[30px] text-right">
                                    {childPercent.toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            )
                          })
                        }
                        {node.children.filter(child => (categoryAmounts[child.id] || 0) > 0).length === 0 && (
                          <span className="text-[10px] text-slate-500 italic">No hay gastos en las subcategorías.</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
