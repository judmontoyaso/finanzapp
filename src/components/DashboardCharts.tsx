'use client'

import { useState } from 'react'
import { Transaction, Category } from '@/types'

type ChartsProps = {
  transactions: Transaction[]
  categories: Category[]
}

export default function DashboardCharts({ transactions, categories }: ChartsProps) {
  const [activeBarIdx, setActiveBarIdx] = useState<number | null>(null)
  const [activeDonutIdx, setActiveDonutIdx] = useState<number | null>(null)

  // --- 1. PROCESAR DATOS PARA EL GRÁFICO HISTÓRICO (ÚLTIMOS 6 MESES) ---
  const getLast6Months = () => {
    const result = []
    const today = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const label = d.toLocaleDateString('es-ES', { month: 'short' })
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      result.push({ label, key, income: 0, expense: 0 })
    }
    return result
  }

  const monthlyHistory = getLast6Months()
  transactions.forEach((tx) => {
    const txMonthKey = tx.date.substring(0, 7) // YYYY-MM
    const monthData = monthlyHistory.find((m) => m.key === txMonthKey)
    if (monthData) {
      if (tx.type === 'income') {
        monthData.income += tx.amount
      } else {
        monthData.expense += tx.amount
      }
    }
  })

  const maxVal = Math.max(
    ...monthlyHistory.map((m) => Math.max(m.income, m.expense)),
    1000 // Evitar divisiones por cero
  )

  // --- 2. PROCESAR DATOS PARA EL GRÁFICO DE DONA (GASTOS POR CATEGORÍA ESTE MES) ---
  const currentMonthKey = new Date().toISOString().substring(0, 7)
  const currentMonthExpenses = transactions.filter(
    (tx) => tx.type === 'expense' && tx.date.startsWith(currentMonthKey)
  )
  const totalExpenseThisMonth = currentMonthExpenses.reduce((sum, tx) => sum + tx.amount, 0)

  const expenseByCategory = categories
    .filter((cat) => cat.type === 'expense')
    .map((cat) => {
      const amount = currentMonthExpenses
        .filter((tx) => tx.category_id === cat.id)
        .reduce((sum, tx) => sum + tx.amount, 0)
      return {
        name: cat.name,
        amount,
        percentage: totalExpenseThisMonth > 0 ? (amount / totalExpenseThisMonth) * 100 : 0
      }
    })
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  // Paleta de colores minimalista y sutil
  const colors = [
    '#059669', // Emerald Darker
    '#0891b2', // Cyan Darker
    '#2563eb', // Blue
    '#d97706', // Amber Darker
    '#db2777', // Pink Darker
    '#7c3aed', // Violet
    '#e11d48', // Rose
    '#475569'  // Slate
  ]

  // Configuración SVG Dona
  const radius = 50
  const circ = 2 * Math.PI * radius
  let accumulatedPercent = 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
      
      {/* GRÁFICO HISTÓRICO: LÍNEAS / ÁREAS */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-sm relative overflow-hidden">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Evolución Semestral</h3>
          <p className="text-[10px] text-slate-500">Comparativa de ingresos y gastos del periodo</p>
        </div>

        {/* Gráfico SVG */}
        <div className="relative h-60 w-full">
          <svg className="w-full h-full" viewBox="0 0 500 220" preserveAspectRatio="none">
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Rejilla */}
            {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
              const y = 20 + r * 160
              return (
                <line
                  key={idx}
                  x1="30"
                  y1={y}
                  x2="480"
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="0.75"
                  strokeDasharray="3 3"
                />
              )
            })}

            {/* Área Ingresos */}
            {(() => {
              const points = monthlyHistory.map((m, idx) => {
                const x = 50 + idx * 80
                const y = 180 - (m.income / maxVal) * 150
                return `${x},${y}`
              })
              if (points.length === 0) return null
              const pathData = `M 50,180 L ${points.join(' L ')} L ${50 + (points.length - 1) * 80},180 Z`
              return <path d={pathData} fill="url(#incomeGrad)" />
            })()}

            {/* Área Gastos */}
            {(() => {
              const points = monthlyHistory.map((m, idx) => {
                const x = 50 + idx * 80
                const y = 180 - (m.expense / maxVal) * 150
                return `${x},${y}`
              })
              if (points.length === 0) return null
              const pathData = `M 50,180 L ${points.join(' L ')} L ${50 + (points.length - 1) * 80},180 Z`
              return <path d={pathData} fill="url(#expenseGrad)" />
            })()}

            {/* Línea Ingresos */}
            {(() => {
              const points = monthlyHistory.map((m, idx) => {
                const x = 50 + idx * 80
                const y = 180 - (m.income / maxVal) * 150
                return `${x},${y}`
              })
              if (points.length === 0) return null
              return (
                <path
                  d={`M ${points.join(' L ')}`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )
            })()}

            {/* Línea Gastos */}
            {(() => {
              const points = monthlyHistory.map((m, idx) => {
                const x = 50 + idx * 80
                const y = 180 - (m.expense / maxVal) * 150
                return `${x},${y}`
              })
              if (points.length === 0) return null
              return (
                <path
                  d={`M ${points.join(' L ')}`}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )
            })()}

            {/* Puntos interactivos */}
            {monthlyHistory.map((m, idx) => {
              const x = 50 + idx * 80
              const yInc = 180 - (m.income / maxVal) * 150
              const yExp = 180 - (m.expense / maxVal) * 150
              const isHovered = activeBarIdx === idx

              return (
                <g key={idx}>
                  <circle
                    cx={x}
                    cy={yInc}
                    r={isHovered ? 5 : 3.5}
                    fill="#10b981"
                    stroke="#020617"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={x}
                    cy={yExp}
                    r={isHovered ? 5 : 3.5}
                    fill="#ef4444"
                    stroke="#020617"
                    strokeWidth="1.5"
                  />
                  <rect
                    x={x - 40}
                    y="10"
                    width="80"
                    height="180"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setActiveBarIdx(idx)}
                    onMouseLeave={() => setActiveBarIdx(null)}
                  />
                </g>
              )
            })}

            {/* Etiquetas eje X */}
            {monthlyHistory.map((m, idx) => {
              const x = 50 + idx * 80
              return (
                <text
                  key={idx}
                  x={x}
                  y="205"
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {m.label}
                </text>
              )
            })}
          </svg>

          {/* Tooltip */}
          {activeBarIdx !== null && (
            <div
              className="absolute bg-slate-900 border border-slate-800 px-3 py-2 rounded-md text-xs shadow-md flex flex-col gap-0.5 pointer-events-none transition-all duration-100"
              style={{
                left: `${50 + activeBarIdx * 15}%`,
                top: '10%',
                transform: 'translateX(-50%)',
              }}
            >
              <p className="font-bold text-slate-350 border-b border-slate-800 pb-1 mb-1 text-[10px]">
                {monthlyHistory[activeBarIdx].key}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-450">Ingresos:</span>
                <span className="font-bold text-emerald-450">
                  ${monthlyHistory[activeBarIdx].income.toLocaleString('es-ES')}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                <span className="text-slate-450">Gastos:</span>
                <span className="font-bold text-rose-450">
                  ${monthlyHistory[activeBarIdx].expense.toLocaleString('es-ES')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Leyenda */}
        <div className="flex justify-center gap-5 mt-1 text-[10px]">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
            <span className="w-2.5 h-1.5 rounded-md bg-emerald-500 inline-block"></span>
            Ingresos
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
            <span className="w-2.5 h-1.5 rounded-md bg-red-500 inline-block"></span>
            Gastos
          </div>
        </div>
      </div>

      {/* GRÁFICO DE GASTOS POR CATEGORÍA */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-sm flex flex-col sm:flex-row items-center gap-6">
        <div className="flex-1 w-full">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Distribución de Gastos</h3>
            <p className="text-[10px] text-slate-500">Gastos agregados del mes actual</p>
          </div>

          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
            {expenseByCategory.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No hay gastos registrados este mes.</p>
            ) : (
              expenseByCategory.map((item, idx) => (
                <div
                  key={item.name}
                  className={`flex justify-between items-center p-1.5 rounded-md transition-all cursor-pointer ${
                    activeDonutIdx === idx
                      ? 'bg-slate-800'
                      : 'bg-transparent hover:bg-slate-800/20'
                  }`}
                  onMouseEnter={() => setActiveDonutIdx(idx)}
                  onMouseLeave={() => setActiveDonutIdx(null)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colors[idx % colors.length] }}
                    ></span>
                    <span className="text-xs font-semibold text-slate-350">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-white">${item.amount.toLocaleString()}</span>
                    <span className="text-[9px] text-slate-500 ml-1.5">{item.percentage.toFixed(0)}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SVG Dona */}
        <div className="w-40 h-40 flex-shrink-0 relative flex items-center justify-center">
          {expenseByCategory.length > 0 ? (
            <svg width="100%" height="100%" viewBox="0 0 120 120" className="transform -rotate-90">
              {expenseByCategory.map((item, idx) => {
                const percentage = item.percentage
                const dashArray = (percentage * circ) / 100
                const dashOffset = circ - (accumulatedPercent * circ) / 100
                accumulatedPercent += percentage
                const isHovered = activeDonutIdx === idx
                const color = colors[idx % colors.length]

                return (
                  <circle
                    key={item.name}
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="transparent"
                    stroke={color}
                    strokeWidth={isHovered ? 12 : 9}
                    strokeDasharray={`${dashArray} ${circ}`}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className="transition-all duration-200 cursor-pointer"
                    style={{ transformOrigin: 'center' }}
                    onMouseEnter={() => setActiveDonutIdx(idx)}
                    onMouseLeave={() => setActiveDonutIdx(null)}
                  />
                )
              })}
            </svg>
          ) : (
            <div className="w-28 h-28 rounded-full border border-dashed border-slate-800 flex items-center justify-center">
              <span className="text-[10px] text-slate-600 font-semibold">Sin Datos</span>
            </div>
          )}

          {/* Centro de la dona */}
          {expenseByCategory.length > 0 && (
            <div className="absolute w-24 h-24 bg-slate-900 rounded-full flex flex-col items-center justify-center text-center pointer-events-none">
              {activeDonutIdx !== null ? (
                <>
                  <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold max-w-[70px] truncate">
                    {expenseByCategory[activeDonutIdx].name}
                  </span>
                  <span className="text-sm font-bold text-white mt-0.5">
                    ${expenseByCategory[activeDonutIdx].amount.toLocaleString()}
                  </span>
                  <span className="text-[9px] text-emerald-500 font-bold">
                    {expenseByCategory[activeDonutIdx].percentage.toFixed(0)}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">
                    Total Gastos
                  </span>
                  <span className="text-base font-bold text-white mt-0.5">
                    ${totalExpenseThisMonth.toLocaleString()}
                  </span>
                  <span className="text-[8px] text-slate-500">Este Mes</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
