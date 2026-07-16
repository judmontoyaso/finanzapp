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
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense')

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

  // Agrupar categorías (árbol) por tipo activo (Gasto/Ingreso)
  const reportCategories = categories.filter(c => c.type === activeTab)
  const rootReportCats = buildCategoryTree(reportCategories)

  // Calcular montos por categoría/subcategoría para el mes actual
  const categoryAmounts: Record<string, number> = {}
  currentMonthTxs.filter(t => t.type === activeTab).forEach(tx => {
    categoryAmounts[tx.category_id] = (categoryAmounts[tx.category_id] || 0) + Number(tx.amount)
  })

  // Calcular montos por categoría/subcategoría para el mes anterior
  const prevCategoryAmounts: Record<string, number> = {}
  prevMonthTxs.filter(t => t.type === activeTab).forEach(tx => {
    prevCategoryAmounts[tx.category_id] = (prevCategoryAmounts[tx.category_id] || 0) + Number(tx.amount)
  })

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
  const categoryReports = rootReportCats.map(node => {
    const amount = getCatTotal(node)
    const prevAmount = getPrevCatTotal(node)
    return {
      node,
      amount,
      prevAmount
    }
  }).filter(item => item.amount > 0).sort((a, b) => b.amount - a.amount)

  // Datos para gráfico donut
  const totalChartAmount = categoryReports.reduce((sum, item) => sum + item.amount, 0)
  let accumulatedPercent = 0
  const donutData = categoryReports.map((item, index) => {
    const percentage = totalChartAmount > 0 ? (item.amount / totalChartAmount) * 100 : 0
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

  // --- GRÁFICO EVOLUCIÓN DIARIA (un solo eje: misma unidad, misma escala) ---
  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth()
  const numDays = new Date(year, month + 1, 0).getDate()

  const dailyIncome: Record<number, number> = {}
  const dailyExpense: Record<number, number> = {}

  for (let d = 1; d <= numDays; d++) {
    dailyIncome[d] = 0
    dailyExpense[d] = 0
  }

  currentMonthTxs.forEach(tx => {
    const txDate = new Date(tx.date + 'T00:00:00')
    const day = txDate.getDate()
    if (tx.type === 'income') {
      dailyIncome[day] = (dailyIncome[day] || 0) + Number(tx.amount)
    } else {
      dailyExpense[day] = (dailyExpense[day] || 0) + Number(tx.amount)
    }
  })

  const dailyData = Array.from({ length: numDays }, (_, i) => {
    const day = i + 1
    return {
      day,
      income: dailyIncome[day],
      expense: dailyExpense[day]
    }
  })

  const maxDaily = Math.max(...dailyData.map(d => Math.max(d.income, d.expense)), 10)

  const [hoveredDay, setHoveredDay] = useState<typeof dailyData[0] | null>(null)
  const [hoveredX, setHoveredX] = useState<number | null>(null)

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const svgX = (mouseX / rect.width) * 500

    if (svgX >= 50 && svgX <= 450) {
      const pct = (svgX - 50) / 400
      const dayIndex = Math.min(
        Math.max(Math.round(pct * (numDays - 1)), 0),
        numDays - 1
      )
      setHoveredDay(dailyData[dayIndex])
      setHoveredX(50 + (dayIndex / (numDays - 1)) * 400)
    } else {
      setHoveredDay(null)
      setHoveredX(null)
    }
  }

  const handleMouseLeave = () => {
    setHoveredDay(null)
    setHoveredX(null)
  }

  const getLinePath = (data: typeof dailyData, type: 'income' | 'expense', maxVal: number) => {
    return data.map((d, i) => {
      const x = 50 + (i / (numDays - 1)) * 400
      const val = type === 'income' ? d.income : d.expense
      const y = 170 - (val / maxVal) * 150
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
  }

  const getAreaPath = (data: typeof dailyData, type: 'income' | 'expense', maxVal: number) => {
    const linePath = getLinePath(data, type, maxVal)
    if (!linePath) return ''
    const startX = 50
    const endX = 50 + 400
    return `${linePath} L ${endX} 170 L ${startX} 170 Z`
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(pct => {
    const val = maxDaily * pct
    const y = 170 - pct * 150
    return { val, y }
  })

  // Formato compacto para etiquetas del eje ($1.5M, $850K)
  const fmtTick = (v: number) => {
    if (v >= 1000000) return `$${(v / 1000000).toLocaleString('es-ES', { maximumFractionDigits: 1 })}M`
    if (v >= 1000) return `$${Math.round(v / 1000)}K`
    return `$${Math.round(v)}`
  }

  const xTicks = [1, Math.floor(numDays / 3), Math.floor(2 * numDays / 3), numDays]

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

      {/* Evolución Diaria */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tendencia del Mes</h2>
            <div className="flex items-center gap-4 mt-1 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-slate-400 font-semibold">Ingresos</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span className="text-slate-400 font-semibold">Gastos</span>
              </span>
            </div>
          </div>
          {hoveredDay && (
            <div className="bg-slate-955 border border-slate-850 px-3 py-1.5 rounded-md flex items-center gap-4 text-xs">
              <span className="text-slate-405 font-medium">Día {hoveredDay.day}</span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-500">Ingreso:</span>
                <span className="text-emerald-450 font-bold">{formatCurrency(hoveredDay.income)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span className="text-slate-500">Gasto:</span>
                <span className="text-rose-455 font-bold">{formatCurrency(hoveredDay.expense)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="relative w-full">
          <svg
            viewBox="0 0 500 200"
            className="w-full h-auto overflow-visible select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.2"/>
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0"/>
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2"/>
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0"/>
              </linearGradient>
            </defs>

            {/* Grid Lineas Horizontales */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
              <line
                key={i}
                x1="50"
                y1={170 - pct * 150}
                x2="450"
                y2={170 - pct * 150}
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            ))}

            {/* Eje X y Línea Base */}
            <line x1="50" y1="170" x2="450" y2="170" stroke="#334155" strokeWidth="1" />

            {/* Gradients y Líneas (misma escala para ambas series) */}
            <path d={getAreaPath(dailyData, 'income', maxDaily)} fill="url(#incomeGrad)" />
            <path d={getAreaPath(dailyData, 'expense', maxDaily)} fill="url(#expenseGrad)" />

            <path d={getLinePath(dailyData, 'income', maxDaily)} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
            <path d={getLinePath(dailyData, 'expense', maxDaily)} fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />

            {/* Eje Y único */}
            <line x1="50" y1="20" x2="50" y2="170" stroke="#334155" strokeWidth="1" />
            {yTicks.map((tick, i) => (
              <g key={i} className="text-[8px] font-semibold">
                <line x1="46" y1={tick.y} x2="50" y2={tick.y} stroke="#334155" strokeWidth="1" />
                <text x="42" y={tick.y + 3} textAnchor="end" className="fill-slate-400">{fmtTick(tick.val)}</text>
              </g>
            ))}

            {/* Etiquetas Eje X (Días) */}
            {xTicks.map((day, i) => {
              const x = 50 + ((day - 1) / (numDays - 1)) * 400
              return (
                <g key={i} className="text-[8px] fill-slate-400 font-semibold">
                  <line x1={x} y1="170" x2={x} y2="174" stroke="#334155" strokeWidth="1" />
                  <text x={x} y="184" textAnchor="middle">Día {day}</text>
                </g>
              )
            })}

            {/* Hover Cursor y Puntos */}
            {hoveredX !== null && hoveredDay && (
              <>
                <line x1={hoveredX} y1="20" x2={hoveredX} y2="170" stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
                
                {/* Punto Ingreso */}
                <circle
                  cx={hoveredX}
                  cy={170 - (hoveredDay.income / maxDaily) * 150}
                  r="4"
                  fill="#10b981"
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />

                {/* Punto Gasto */}
                <circle
                  cx={hoveredX}
                  cy={170 - (hoveredDay.expense / maxDaily) * 150}
                  r="4"
                  fill="#f43f5e"
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
              </>
            )}
          </svg>
        </div>
      </div>

      {/* Detalle de Categorías (con selector de tipo) */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Distribución por Categorías</h2>
          
          {/* Selector de Gastos / Ingresos */}
          <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-md">
            <button
              onClick={() => { setActiveTab('expense'); setExpandedCategories({}); }}
              className={`px-3 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                activeTab === 'expense'
                  ? 'bg-rose-500 text-white shadow'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Gastos
            </button>
            <button
              onClick={() => { setActiveTab('income'); setExpandedCategories({}); }}
              className={`px-3 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                activeTab === 'income'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              Ingresos
            </button>
          </div>
        </div>

        {totalChartAmount === 0 ? (
          <div className="p-12 text-center text-slate-505">
            <p className="text-xs font-semibold">No se registraron {activeTab === 'expense' ? 'gastos' : 'ingresos'} en este mes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Gráfico Donut (custom SVG) */}
            <div className="lg:col-span-2 flex flex-col items-center justify-center space-y-4">
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
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{activeTab === 'expense' ? 'Gastado' : 'Recibido'}</span>
                  <span className="text-sm font-black text-slate-100">{formatCurrency(totalChartAmount)}</span>
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
            <div className="lg:col-span-3 space-y-4">
              <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                {categoryReports.map(({ node, amount, prevAmount }) => {
                  const percent = totalChartAmount > 0 ? (amount / totalChartAmount) * 100 : 0
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
                            <span className="text-[10px] font-semibold text-slate-505">{percent.toFixed(1)}% del total</span>
                            
                            {/* Variación MoM */}
                            {prevAmount > 0 && (
                              <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold ${
                                isUp 
                                  ? (activeTab === 'expense' ? 'text-rose-455' : 'text-emerald-400') 
                                  : (activeTab === 'expense' ? 'text-emerald-400' : 'text-rose-455')
                              }`}>
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
                              className="p-1 hover:bg-slate-850 rounded text-slate-400 hover:text-slate-100 cursor-pointer"
                            >
                              {isExpanded ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Barra de Progreso */}
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-850">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            activeTab === 'expense' ? 'bg-rose-500/70' : 'bg-emerald-500'
                          }`} 
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
                                        className={`h-full rounded-full ${
                                          activeTab === 'expense' ? 'bg-rose-500/50' : 'bg-emerald-450/70'
                                        }`} 
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
                            <span className="text-[10px] text-slate-500 italic">No hay registros en las subcategorías.</span>
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
    </div>
  )
}
