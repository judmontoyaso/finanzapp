'use client'

import { useState, useEffect, useMemo } from 'react'
import { LocalDB } from '@/lib/db'
import { Category, Budget, Transaction } from '@/types'
import { toast } from 'react-hot-toast'
import { FiEdit, FiPlus, FiX, FiChevronDown, FiChevronUp, FiSearch, FiSliders, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import CategoryIcon from '@/components/CategoryIcon'

export default function BudgetsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnlyBudgeted, setShowOnlyBudgeted] = useState(false)
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({})

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
  const expenseCategories = useMemo(() => {
    return categories.filter((c) => c.type === 'expense')
  }, [categories])

  // Obtener mes actual
  const today = new Date()
  const currentMonthKey = today.toISOString().substring(0, 7) // YYYY-MM
  const currentMonthLabel = today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  
  const currentMonthExpenses = useMemo(() => {
    return transactions.filter(
      (tx) => tx.type === 'expense' && tx.date.startsWith(currentMonthKey)
    )
  }, [transactions, currentMonthKey])

  // Estructurar árbol de presupuestos agrupado por Categorías Principales y Subcategorías
  const hierarchicalBudgets = useMemo(() => {
    const parentCats = expenseCategories.filter((c) => !c.parent_id)

    return parentCats.map((parent) => {
      // Subcategorías de esta categoría padre
      const subcats = expenseCategories.filter((c) => c.parent_id === parent.id)
      const subcatIds = subcats.map((s) => s.id)
      const allGroupIds = [parent.id, ...subcatIds]

      // Presupuesto directo asignado al padre (ej. $500,000 para Familia)
      const parentBudgetObj = budgets.find((b) => b.category_id === parent.id)
      const parentDirectBudget = parentBudgetObj ? parentBudgetObj.amount : 0

      // Gastos directos hechos a la categoría padre (sin subcategoría)
      const parentDirectSpent = currentMonthExpenses
        .filter((tx) => tx.category_id === parent.id)
        .reduce((sum, tx) => sum + tx.amount, 0)

      // Detalle de cada subcategoría
      const subcategoriesData = subcats.map((sub) => {
        const subBudgetObj = budgets.find((b) => b.category_id === sub.id)
        const subBudget = subBudgetObj ? subBudgetObj.amount : 0
        const subSpent = currentMonthExpenses
          .filter((tx) => tx.category_id === sub.id)
          .reduce((sum, tx) => sum + tx.amount, 0)
        
        const subPercent = subBudget > 0 ? (subSpent / subBudget) * 100 : 0

        return {
          category: sub,
          budgetAmount: subBudget,
          budgetId: subBudgetObj ? subBudgetObj.id : null,
          spent: subSpent,
          percent: subPercent,
          isOverBudget: subBudget > 0 && subSpent > subBudget,
          isClose: subBudget > 0 && subPercent >= 80 && subSpent <= subBudget
        }
      })

      // Suma total de presupuestos en subcategorías
      const sumOfSubcatBudgets = subcategoriesData.reduce((sum, s) => sum + s.budgetAmount, 0)

      // Total gastado en todo el grupo (padre + todas sus subcategorías)
      const totalGroupSpent = currentMonthExpenses
        .filter((tx) => allGroupIds.includes(tx.category_id))
        .reduce((sum, tx) => sum + tx.amount, 0)

      // Meta efectiva del grupo:
      // Si el padre tiene meta asignada (ej. $500k), esa es la meta global del grupo.
      // Si el padre no tiene meta directa pero las subcats sí, la meta es la suma de subcats.
      const effectiveGroupBudget = parentDirectBudget > 0 ? parentDirectBudget : sumOfSubcatBudgets
      const hasAnyBudget = parentDirectBudget > 0 || sumOfSubcatBudgets > 0
      const groupPercent = effectiveGroupBudget > 0 ? (totalGroupSpent / effectiveGroupBudget) * 100 : 0
      const isOverBudget = effectiveGroupBudget > 0 && totalGroupSpent > effectiveGroupBudget
      const isClose = effectiveGroupBudget > 0 && groupPercent >= 80 && !isOverBudget

      return {
        parent,
        parentDirectBudget,
        parentDirectSpent,
        subcategories: subcategoriesData,
        sumOfSubcatBudgets,
        totalGroupSpent,
        effectiveGroupBudget,
        hasAnyBudget,
        groupPercent,
        isOverBudget,
        isClose
      }
    })
  }, [expenseCategories, budgets, currentMonthExpenses])

  // Totales Globales
  const totalBudgeted = useMemo(() => {
    return hierarchicalBudgets.reduce((sum, g) => sum + g.effectiveGroupBudget, 0)
  }, [hierarchicalBudgets])

  const totalSpentInBudgets = useMemo(() => {
    return hierarchicalBudgets
      .filter((g) => g.hasAnyBudget)
      .reduce((sum, g) => sum + g.totalGroupSpent, 0)
  }, [hierarchicalBudgets])

  const globalPercent = totalBudgeted > 0 ? (totalSpentInBudgets / totalBudgeted) * 100 : 0
  const totalBudgetedGroupsCount = hierarchicalBudgets.filter((g) => g.hasAnyBudget).length

  // Filtrado y búsqueda
  const filteredList = useMemo(() => {
    const cleanSearch = searchTerm.toLowerCase().trim()

    return hierarchicalBudgets
      .filter((group) => {
        // Filtro "solo con presupuesto"
        if (showOnlyBudgeted && !group.hasAnyBudget) return false

        // Búsqueda por texto (en padre o en subcategorías)
        if (cleanSearch) {
          const matchParent = group.parent.name.toLowerCase().includes(cleanSearch)
          const matchSub = group.subcategories.some((s) => s.category.name.toLowerCase().includes(cleanSearch))
          if (!matchParent && !matchSub) return false
        }

        return true
      })
      .sort((a, b) => {
        // Primero los que tienen presupuesto
        if (a.hasAnyBudget !== b.hasAnyBudget) return a.hasAnyBudget ? -1 : 1
        // Luego los más excedidos o con mayor % de consumo
        return b.groupPercent - a.groupPercent
      })
  }, [hierarchicalBudgets, showOnlyBudgeted, searchTerm])

  // Alternar acordeón de una categoría padre
  const toggleParent = (parentId: string) => {
    setExpandedParents((prev) => ({
      ...prev,
      [parentId]: prev[parentId] === undefined ? false : !prev[parentId] // Default abierto
    }))
  }

  // Expandir / Colapsar todos
  const toggleExpandAll = () => {
    const allExpanded = filteredList.every((g) => expandedParents[g.parent.id] !== false)
    const newObj: Record<string, boolean> = {}
    filteredList.forEach((g) => {
      newObj[g.parent.id] = !allExpanded
    })
    setExpandedParents(newObj)
  }

  // Abrir modal para fijar meta (Padre o Subcategoría)
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
        const budget = budgets.find((b) => b.category_id === selectedCategory.id)
        if (budget) {
          await LocalDB.deleteBudget(budget.id)
          toast.success('Meta de presupuesto eliminada')
        }
      } else {
        await LocalDB.saveBudget(selectedCategory.id, amount)
        toast.success(`Meta de $${amount.toLocaleString()} fijada para ${selectedCategory.name}`)
      }
      setIsModalOpen(false)
      setSelectedCategory(null)
      setBudgetAmount('')
      await loadData()
    } catch {
      toast.error('Error al guardar el presupuesto')
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
            <img src="/icons/planning.png" alt="" className="w-7 h-7 object-contain" />
            Metas de Presupuesto
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Asigna metas globales por categoría y límites específicos por subcategoría para {currentMonthLabel}.
          </p>
        </div>

        <button
          type="button"
          onClick={toggleExpandAll}
          className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
        >
          <FiSliders className="w-3.5 h-3.5 text-slate-400" />
          Alternar Acordeones
        </button>
      </div>

      {/* TARJETA DE RESUMEN GLOBAL */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-sm relative overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Presupuesto Mensual Total</span>
            <p className="text-2xl font-extrabold text-slate-100 mt-1">
              ${totalBudgeted.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gastado en Categorías con Meta</span>
            <p className="text-2xl font-extrabold text-rose-400 mt-1">
              ${totalSpentInBudgets.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Consumo del Presupuesto</span>
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
              <span>100% límite mensual (${totalBudgeted.toLocaleString('es-ES', { minimumFractionDigits: 2 })})</span>
            </div>
          </div>
        )}
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTRO */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Buscar categoría o subcategoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-md py-1.5 pl-8 pr-3 text-xs focus:border-emerald-500 outline-none"
          />
          <FiSearch className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <p className="text-xs text-slate-400 font-semibold">
            <span className="text-slate-100 font-bold">{totalBudgetedGroupsCount}</span> de {hierarchicalBudgets.length} categorías con meta
          </p>
          <button
            onClick={() => setShowOnlyBudgeted((v) => !v)}
            className={`px-3 py-1.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
              showOnlyBudgeted
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-100'
            }`}
          >
            {showOnlyBudgeted ? 'Mostrando con meta' : 'Solo con meta'}
          </button>
        </div>
      </div>

      {/* LISTADO JERÁRQUICO DE PRESUPUESTOS (CATEGORÍA PADRE Y SUBCATEGORÍAS) */}
      {filteredList.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-md p-10 text-center text-slate-500 text-xs">
          {showOnlyBudgeted ? 'No has asignado metas de presupuesto todavía.' : 'No se encontraron categorías.'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map((group) => {
            const isExpanded = expandedParents[group.parent.id] !== false // Default abierto
            const hasParentBudget = group.parentDirectBudget > 0
            const hasEffectiveBudget = group.effectiveGroupBudget > 0
            const percent = Math.min(group.groupPercent, 100)
            const remaining = Math.max(0, group.effectiveGroupBudget - group.totalGroupSpent)

            let cardBorder = 'border-slate-800'
            let barColor = 'bg-emerald-500'
            let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            let badgeText = 'Saludable'

            if (hasEffectiveBudget) {
              if (group.isOverBudget) {
                cardBorder = 'border-rose-900/60'
                barColor = 'bg-rose-500'
                badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                badgeText = 'Límite Excedido'
              } else if (group.isClose) {
                cardBorder = 'border-amber-900/60'
                barColor = 'bg-amber-500'
                badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                badgeText = 'Cerca del Límite'
              }
            } else {
              badgeColor = 'bg-slate-950 text-slate-500 border-slate-800'
              badgeText = 'Sin Meta Global'
            }

            return (
              <div
                key={group.parent.id}
                className={`bg-slate-900 border ${cardBorder} rounded-md overflow-hidden shadow-sm transition-all`}
              >
                {/* CABECERA DE LA CATEGORÍA PADRE */}
                <div className="p-4 sm:p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <CategoryIcon
                        icon={group.parent.icon}
                        name={group.parent.name}
                        type="expense"
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-100 text-sm sm:text-base leading-tight truncate">
                            {group.parent.name}
                          </h3>
                          <span className={`inline-block px-2 py-0.2 rounded text-[10px] font-semibold border ${badgeColor}`}>
                            {badgeText}
                          </span>
                          {group.subcategories.length > 0 && (
                            <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.2 rounded font-medium">
                              {group.subcategories.length} subcategoría{group.subcategories.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Rótulo de desglose */}
                        <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                          {hasParentBudget ? (
                            <span>Meta global grupo: <strong className="text-slate-200">${group.parentDirectBudget.toLocaleString()}</strong></span>
                          ) : (
                            <span className="text-slate-500 italic">Sin meta global asignada al grupo</span>
                          )}
                          {group.sumOfSubcatBudgets > 0 && (
                            <>
                              <span className="text-slate-700">•</span>
                              <span className="text-emerald-400">
                                Asignado en subcategorías: <strong>${group.sumOfSubcatBudgets.toLocaleString()}</strong>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botones de acción del Padre */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleOpenConfig(group.parent, group.parentDirectBudget)}
                        className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-emerald-400 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        title={hasParentBudget ? 'Editar Meta de la Categoría' : 'Fijar Meta de la Categoría'}
                      >
                        {hasParentBudget ? <FiEdit className="w-3.5 h-3.5" /> : <FiPlus className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{hasParentBudget ? 'Editar Meta Grupo' : 'Fijar Meta Grupo'}</span>
                      </button>

                      {group.subcategories.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleParent(group.parent.id)}
                          className="p-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 rounded-md transition-all cursor-pointer"
                          title={isExpanded ? 'Colapsar subcategorías' : 'Expandir subcategorías'}
                        >
                          {isExpanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Métricas y Barra de Progreso del Grupo */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 border border-slate-850 rounded-md p-3 text-xs">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Gastado Total Grupo</span>
                      <span className={`text-sm font-bold block mt-0.5 ${group.isOverBudget ? 'text-rose-400' : 'text-slate-200'}`}>
                        ${group.totalGroupSpent.toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Límite Total Grupo</span>
                      <span className="text-sm font-bold block mt-0.5 text-slate-300">
                        {hasEffectiveBudget ? `$${group.effectiveGroupBudget.toLocaleString()}` : '--'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Disponible</span>
                      <span className="text-sm font-bold block mt-0.5 text-emerald-400">
                        {hasEffectiveBudget ? `$${remaining.toLocaleString()}` : '--'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Consumo</span>
                      <span className={`text-sm font-bold block mt-0.5 ${group.isOverBudget ? 'text-rose-400' : group.isClose ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {hasEffectiveBudget ? `${group.groupPercent.toFixed(1)}%` : '--'}
                      </span>
                    </div>
                  </div>

                  {hasEffectiveBudget && (
                    <div className="space-y-1">
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* DESGLOSE DE SUBCATEGORÍAS */}
                {group.subcategories.length > 0 && isExpanded && (
                  <div className="border-t border-slate-800 bg-slate-950/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Subcategorías de {group.parent.name} ({group.subcategories.length})
                      </span>
                    </div>

                    <div className="divide-y divide-slate-800/60 bg-slate-900/60 border border-slate-800 rounded-md overflow-hidden">
                      {group.subcategories.map((sub) => {
                        const hasSubBudget = sub.budgetAmount > 0
                        const subPercent = Math.min(sub.percent, 100)
                        const subRemaining = Math.max(0, sub.budgetAmount - sub.spent)

                        let subBarColor = 'bg-emerald-500'
                        if (sub.isOverBudget) subBarColor = 'bg-rose-500'
                        else if (sub.isClose) subBarColor = 'bg-amber-500'

                        return (
                          <div
                            key={sub.category.id}
                            className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-850/40 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <CategoryIcon
                                icon={sub.category.icon}
                                name={sub.category.name}
                                type="expense"
                                size="sm"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-slate-200 truncate">
                                    {sub.category.name}
                                  </span>
                                  {hasSubBudget ? (
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${
                                      sub.isOverBudget
                                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                        : sub.isClose
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    }`}>
                                      {sub.isOverBudget ? 'Excedido' : sub.isClose ? 'Alerta' : `${sub.percent.toFixed(0)}%`}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-500 bg-slate-950 px-1.5 py-0.2 rounded">
                                      Sin meta específica
                                    </span>
                                  )}
                                </div>

                                {hasSubBudget && (
                                  <div className="flex items-center gap-2 mt-1.5 max-w-xs">
                                    <div className="flex-1 bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-800">
                                      <div
                                        className={`h-full rounded-full ${subBarColor}`}
                                        style={{ width: `${subPercent}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-[9px] text-slate-500 font-semibold shrink-0">
                                      Disp: ${subRemaining.toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Métricas y botón de edición de la subcategoría */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/40">
                              <div className="text-left sm:text-right">
                                <div className="text-xs font-bold text-slate-200">
                                  Gastado: <span className={sub.isOverBudget ? 'text-rose-400' : 'text-slate-200'}>${sub.spent.toLocaleString()}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium">
                                  Meta: {hasSubBudget ? `$${sub.budgetAmount.toLocaleString()}` : '--'}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleOpenConfig(sub.category, sub.budgetAmount)}
                                className="p-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-emerald-400 rounded-md transition-all cursor-pointer flex items-center gap-1 text-xs"
                                title={hasSubBudget ? 'Editar Meta Subcategoría' : 'Fijar Meta Subcategoría'}
                              >
                                {hasSubBudget ? <FiEdit className="w-3.5 h-3.5" /> : <FiPlus className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Fila para gastos directos en el padre si los hay */}
                    {group.parentDirectSpent > 0 && (
                      <div className="p-2.5 bg-slate-900/40 border border-slate-800/60 rounded-md flex items-center justify-between text-xs text-slate-400">
                        <span>Gastos registrados directamente en {group.parent.name}:</span>
                        <strong className="text-slate-200">${group.parentDirectSpent.toLocaleString()}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL CONFIGURACIÓN DE META DE PRESUPUESTO */}
      {isModalOpen && selectedCategory && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-md p-6 shadow-md relative animate-fadeIn">
            <button
              onClick={() => { setIsModalOpen(false); setSelectedCategory(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <CategoryIcon
                icon={selectedCategory.icon}
                name={selectedCategory.name}
                type="expense"
                size="md"
              />
              <div>
                <h2 className="text-md font-bold text-slate-100">
                  {budgetAmount ? 'Modificar Meta' : 'Fijar Meta Mensual'}
                </h2>
                <span className="text-[11px] text-emerald-400 font-semibold block">
                  {selectedCategory.parent_id
                    ? `Subcategoría de ${categories.find(c => c.id === selectedCategory.parent_id)?.name || 'Categoría'}`
                    : 'Categoría Principal (Meta Global de Grupo)'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              {selectedCategory.parent_id
                ? `Establece el límite de gasto específico para "${selectedCategory.name}".`
                : `Establece el límite de gasto total para el grupo "${selectedCategory.name}" (abarca todos los gastos de este concepto y sus subcategorías).`}
            </p>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Monto de la Meta ($)
                </label>
                <input
                  type="number"
                  required
                  step="1"
                  placeholder="Ej. 500000"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2.5 px-3 text-sm focus:border-emerald-500 outline-none transition-all"
                  autoFocus
                />
                <span className="text-[10px] text-slate-500 block mt-1.5 leading-relaxed">
                  Ingresa 0 o deja el campo vacío para eliminar la meta de presupuesto.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setSelectedCategory(null); }}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-md text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  Guardar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
