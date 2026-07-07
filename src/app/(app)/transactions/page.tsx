'use client'

import { useState, useEffect } from 'react'
import { LocalDB } from '@/lib/db'
import { Transaction, Category } from '@/types'
import { toast } from 'react-hot-toast'
import {
  FiPlus,
  FiDownload,
  FiEdit,
  FiTrash2,
  FiSearch,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiFilter,
  FiX
} from 'react-icons/fi'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Filtros avanzados colapsables
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Estado de modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  // Tipo seleccionado en el modal (para filtrar categorías por tipo)
  const [formType, setFormType] = useState<'income' | 'expense'>('expense')
  const [formCategory, setFormCategory] = useState('')

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const loadData = async () => {
    try {
      const txs = await LocalDB.getTransactions()
      const cats = await LocalDB.getCategories()
      setTransactions(txs)
      setCategories(cats)
    } catch (e) {
      console.error('Error cargando transacciones', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    window.addEventListener('finanzas_data_changed', loadData)
    return () => window.removeEventListener('finanzas_data_changed', loadData)
  }, [])

  // Filtrar transacciones
  const filteredTransactions = transactions
    .filter((tx) => {
      const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = typeFilter === 'all' || tx.type === typeFilter
      const matchesCategory = categoryFilter === 'all' || tx.category_id === categoryFilter
      
      let matchesStartDate = true
      if (startDate) {
        matchesStartDate = new Date(tx.date) >= new Date(startDate)
      }
      
      let matchesEndDate = true
      if (endDate) {
        matchesEndDate = new Date(tx.date) <= new Date(endDate)
      }

      return matchesSearch && matchesType && matchesCategory && matchesStartDate && matchesEndDate
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Paginación de transacciones filtradas
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage)

  // Categorías agrupadas por tipo
  const incomeCats = categories.filter((c) => c.type === 'income')
  const expenseCats = categories.filter((c) => c.type === 'expense')
  const formCats = formType === 'income' ? incomeCats : expenseCats
  const activeFilterCount = [typeFilter !== 'all', categoryFilter !== 'all', !!startDate, !!endDate].filter(Boolean).length

  const openAddModal = () => {
    setFormType('expense')
    setFormCategory(expenseCats[0]?.id || '')
    setIsAddModalOpen(true)
  }

  const changeFormType = (t: 'income' | 'expense') => {
    setFormType(t)
    const list = t === 'income' ? incomeCats : expenseCats
    setFormCategory(list[0]?.id || '')
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Restablecer filtros
  const handleResetFilters = () => {
    setSearchTerm('')
    setTypeFilter('all')
    setCategoryFilter('all')
    setStartDate('')
    setEndDate('')
    setCurrentPage(1)
  }

  // --- CRUD ACTIONS ---
  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const amountStr = formData.get('amount') as string
    const category_id = formData.get('category_id') as string
    const type = formData.get('type') as 'income' | 'expense'
    const date = formData.get('date') as string
    const description = formData.get('description') as string

    if (!amountStr || !category_id || !type || !date || !description) return

    try {
      await LocalDB.addTransaction({
        description,
        amount: parseFloat(amountStr),
        type,
        category_id,
        date
      })
      setIsAddModalOpen(false)
      e.currentTarget.reset()
      toast.success('Movimiento registrado con éxito')
    } catch {
      toast.error('Error al guardar movimiento')
    }
  }

  const handleEditOpen = (tx: Transaction) => {
    setEditingTransaction(tx)
    setFormType(tx.type)
    setFormCategory(tx.category_id)
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingTransaction) return
    const formData = new FormData(e.currentTarget)
    
    const amountStr = formData.get('amount') as string
    const category_id = formData.get('category_id') as string
    const type = formData.get('type') as 'income' | 'expense'
    const date = formData.get('date') as string
    const description = formData.get('description') as string

    if (!amountStr || !category_id || !type || !date || !description) return

    try {
      await LocalDB.updateTransaction(editingTransaction.id, {
        description,
        amount: parseFloat(amountStr),
        type,
        category_id,
        date
      })
      setIsEditModalOpen(false)
      setEditingTransaction(null)
      toast.success('Movimiento actualizado con éxito')
    } catch {
      toast.error('Error al actualizar movimiento')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar esta transacción?')) {
      try {
        await LocalDB.deleteTransaction(id)
        toast.success('Transacción eliminada')
      } catch {
        toast.error('Error al eliminar transacción')
      }
    }
  }

  // --- EXPORTAR CSV ---
  const handleExportCSV = () => {
    const headers = ['Fecha', 'Descripcion', 'Categoria', 'Tipo', 'Monto']
    const rows = filteredTransactions.map((tx) => {
      const cat = categories.find((c) => c.id === tx.category_id)
      return [
        tx.date,
        `"${tx.description.replace(/"/g, '""')}"`,
        cat ? cat.name : 'Sin Categoria',
        tx.type === 'income' ? 'Ingreso' : 'Gasto',
        tx.amount
      ]
    })

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `transacciones_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
      {/* Título */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Historial de Transacciones</h1>
          <p className="text-slate-400 text-xs mt-1">Busca, filtra, exporta y gestiona tus ingresos y gastos.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={filteredTransactions.length === 0}
            className="flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-3.5 py-2.5 rounded-md font-bold text-xs shadow-sm active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <FiDownload className="w-4 h-4" />
            Exportar CSV
          </button>
          
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-md font-bold text-xs shadow-sm active:scale-[0.99] cursor-pointer"
          >
            <FiPlus className="w-4 h-4" />
            Nueva Transacción
          </button>
        </div>
      </div>

      {/* SECCIÓN DE FILTROS */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-4 shadow-sm space-y-3">
        {/* Barra: búsqueda + toggle avanzados */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por descripción..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-md py-2 px-3 pl-8 text-xs focus:border-emerald-500 outline-none transition-all"
            />
            <FiSearch className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold border transition-all cursor-pointer ${
              filtersOpen || activeFilterCount > 0
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FiFilter className="w-3.5 h-3.5" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-emerald-500 text-white text-[9px] font-black">{activeFilterCount}</span>
            )}
            <FiChevronDown className={`w-3.5 h-3.5 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
          {activeFilterCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
            >
              <FiRefreshCw className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </div>

        {/* Avanzados (colapsable) */}
        {filtersOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 animate-fadeIn">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1.5">Tipo</label>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value as 'all' | 'income' | 'expense'); setCurrentPage(1); }}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all cursor-pointer"
              >
                <option value="all">Todos los Movimientos</option>
                <option value="income">Ingresos (+)</option>
                <option value="expense">Gastos (-)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1.5">Categoría</label>
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all cursor-pointer"
              >
                <option value="all">Todas las Categorías</option>
                {incomeCats.length > 0 && (
                  <optgroup label="Ingresos">
                    {incomeCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                )}
                {expenseCats.length > 0 && (
                  <optgroup label="Gastos">
                    {expenseCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1.5">Desde</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1.5">Hasta</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* LISTADO DE TRANSACCIONES */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-sm">
        <div className="overflow-x-auto">
          {paginatedTransactions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-xs font-semibold">No se encontraron movimientos.</p>
              <button
                onClick={handleResetFilters}
                className="mt-3 px-3 py-1.5 bg-slate-950 border border-slate-850 rounded-md text-[10px] font-bold text-emerald-500 hover:bg-slate-900 transition-all cursor-pointer"
              >
                Limpiar Filtros
              </button>
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[10px] uppercase font-bold tracking-wider text-left">
                  <th className="pb-3 pr-3">Fecha</th>
                  <th className="pb-3 pr-3">Descripción</th>
                  <th className="pb-3 pr-3">Categoría</th>
                  <th className="pb-3 pr-3">Tipo</th>
                  <th className="pb-3 text-right pr-4">Monto</th>
                  <th className="pb-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {paginatedTransactions.map((tx) => {
                  const category = categories.find((c) => c.id === tx.category_id)
                  const isIncome = tx.type === 'income'
                  return (
                    <tr key={tx.id} className="hover:bg-slate-850/10">
                      <td className="py-3 text-slate-400 font-semibold whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 font-bold text-slate-200">{tx.description}</td>
                      <td className="py-3">
                        <span className="inline-block px-2.5 py-0.5 bg-slate-950 text-slate-400 rounded-md text-[10px] border border-slate-850">
                          {category ? category.name : 'Sin Categoría'}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isIncome ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${isIncome ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                          {isIncome ? 'Ingreso' : 'Gasto'}
                        </span>
                      </td>
                      <td className={`py-3 text-right font-bold pr-4 whitespace-nowrap text-sm ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isIncome ? '+' : '-'}${Math.abs(tx.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-center whitespace-nowrap">
                        <div className="flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => handleEditOpen(tx)}
                            className="p-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-450 hover:text-slate-100 rounded-md transition-all cursor-pointer"
                          >
                            <FiEdit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 bg-slate-950 border border-slate-850 hover:bg-red-950/40 text-slate-450 hover:text-red-400 rounded-md transition-all cursor-pointer"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-800">
            <span className="text-[10px] text-slate-500 font-semibold">
              Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredTransactions.length)} de {filteredTransactions.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-300 rounded-md disabled:opacity-40 transition-all cursor-pointer"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              {[...Array(totalPages)].map((_, idx) => {
                const pageNum = idx + 1
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-emerald-600 text-white font-black shadow-sm'
                        : 'bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-400'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1.5 bg-slate-950 border border-slate-850 hover:bg-slate-800 text-slate-300 rounded-md disabled:opacity-40 transition-all cursor-pointer"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: AGREGAR TRANSACCIÓN */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-md p-6 shadow-md relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-100"
            >
              <FiX className="w-5 h-5" />
            </button>

            <h2 className="text-md font-bold text-slate-100 mb-6">Añadir Nueva Transacción</h2>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Descripción</label>
                <input
                  type="text"
                  name="description"
                  required
                  placeholder="Ej. Compra de insumos"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Monto ($)</label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Fecha</label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tipo</label>
                  <select
                    name="type"
                    required
                    value={formType}
                    onChange={(e) => changeFormType(e.target.value as 'income' | 'expense')}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="expense">Gasto (-)</option>
                    <option value="income">Ingreso (+)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Categoría</label>
                  <select
                    name="category_id"
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all cursor-pointer"
                  >
                    {formCats.length === 0 && <option value="">Sin categorías de este tipo</option>}
                    {formCats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-350 rounded-md text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-all"
                >
                  Guardar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR TRANSACCIÓN */}
      {isEditModalOpen && editingTransaction && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-md p-6 shadow-md relative">
            <button
              onClick={() => { setIsEditModalOpen(false); setEditingTransaction(null); }}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-100"
            >
              <FiX className="w-5 h-5" />
            </button>

            <h2 className="text-md font-bold text-slate-100 mb-6">Editar Transacción</h2>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Descripción</label>
                <input
                  type="text"
                  name="description"
                  required
                  defaultValue={editingTransaction.description}
                  placeholder="Ej. Compra de supermercado"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Monto ($)</label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    required
                    defaultValue={editingTransaction.amount}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Fecha</label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={editingTransaction.date}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tipo</label>
                  <select
                    name="type"
                    required
                    value={formType}
                    onChange={(e) => changeFormType(e.target.value as 'income' | 'expense')}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="expense">Gasto (-)</option>
                    <option value="income">Ingreso (+)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Categoría</label>
                  <select
                    name="category_id"
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all cursor-pointer"
                  >
                    {formCats.length === 0 && <option value="">Sin categorías de este tipo</option>}
                    {formCats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingTransaction(null); }}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-305 rounded-md text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-all"
                >
                  Actualizar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
