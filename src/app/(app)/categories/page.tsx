'use client'

import { useState, useEffect } from 'react'
import { LocalDB, buildCategoryTree, CategoryNode } from '@/lib/db'
import { Category } from '@/types'
import { toast } from 'react-hot-toast'
import { FiPlus, FiTrash2, FiTrendingUp, FiTrendingDown, FiSearch, FiX, FiFolder, FiCornerDownRight } from 'react-icons/fi'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estados para nueva categoría
  const [newCatName, setNewCatName] = useState('')
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense')
  const [newCatParentId, setNewCatParentId] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const loadData = async () => {
    try {
      const cats = await LocalDB.getCategories()
      setCategories(cats)
    } catch {
      console.error('Error cargando categorías')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    window.addEventListener('finanzas_data_changed', loadData)
    return () => window.removeEventListener('finanzas_data_changed', loadData)
  }, [])

  // Filtrar categorías
  const q = search.trim().toLowerCase()
  const match = (c: Category) => !q || c.name.toLowerCase().includes(q)

  // Separar categorías principales y subcategorías filtradas
  const rootIncomeCats = buildCategoryTree(categories.filter(c => c.type === 'income'))
  const rootExpenseCats = buildCategoryTree(categories.filter(c => c.type === 'expense'))

  // Manejar adición de categoría
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return

    try {
      await LocalDB.addCategory(newCatName.trim(), newCatType, newCatParentId || null)
      setNewCatName('')
      setNewCatParentId('')
      setIsAddModalOpen(false)
      toast.success('Categoría agregada con éxito')
    } catch {
      toast.error('Error al agregar categoría')
    }
  }

  // Manejar eliminación
  const handleDeleteCategory = async (id: string, name: string) => {
    const hasChildren = categories.some(c => c.parent_id === id)
    const msg = hasChildren 
      ? `La categoría "${name}" tiene subcategorías. Si la eliminas, sus subcategorías quedarán sin categoría padre. ¿Deseas continuar?`
      : `¿Estás seguro de que deseas eliminar la categoría "${name}"?`

    if (confirm(msg)) {
      try {
        await LocalDB.deleteCategory(id)
        toast.success('Categoría eliminada')
      } catch {
        toast.error('Error al eliminar categoría')
      }
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

  // Opciones de categoría padre posibles para el formulario
  const parentOptions = categories.filter(c => c.type === newCatType && !c.parent_id)

  const renderCategoryTree = (nodes: CategoryNode[], isIncome: boolean) => {
    return nodes
      .filter(node => {
        // Mostrar si coincide él mismo o alguna de sus hijas coincide con la búsqueda
        if (!q) return true
        const matchesSelf = node.name.toLowerCase().includes(q)
        const matchesAnyChild = node.children.some(child => child.name.toLowerCase().includes(q))
        return matchesSelf || matchesAnyChild
      })
      .map((cat) => {
        const isCustom = cat.user_id !== null && cat.user_id !== undefined
        return (
          <div key={cat.id} className="space-y-2 mb-3">
            {/* Categoría Padre */}
            <div className="bg-slate-950 border border-slate-850 rounded-md p-3.5 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <FiFolder className={`w-4 h-4 flex-shrink-0 ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`} />
                <div>
                  <span className="font-semibold text-slate-200 text-xs block truncate">{cat.name}</span>
                  <span className={`text-[9px] inline-block font-semibold px-2 py-0.5 rounded-md mt-1 border ${
                    isCustom ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/10' : 'bg-slate-900 text-slate-500 border-slate-850'
                  }`}>
                    {isCustom ? 'Personalizada' : 'Sistema'}
                  </span>
                </div>
              </div>

              {isCustom && (
                <button
                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                  className="p-1.5 bg-slate-900 border border-slate-850 text-slate-500 hover:text-red-400 rounded-md transition-all cursor-pointer"
                  title="Eliminar categoría"
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Subcategorías (Hijas) */}
            {cat.children && cat.children.length > 0 && (
              <div className="pl-6 space-y-2 border-l border-slate-800/80 ml-4.5">
                {cat.children
                  .filter(child => !q || child.name.toLowerCase().includes(q))
                  .map((child) => {
                    const childIsCustom = child.user_id !== null && child.user_id !== undefined
                    return (
                      <div
                        key={child.id}
                        className="bg-slate-900/60 border border-slate-850/60 rounded-md p-2.5 flex justify-between items-center"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FiCornerDownRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-slate-300 text-xs block truncate">{child.name}</span>
                            <span className={`text-[8px] inline-block font-medium px-1.5 py-0.2 rounded-md mt-0.5 border ${
                              childIsCustom ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/10' : 'bg-slate-950 text-slate-600 border-slate-850'
                            }`}>
                              {childIsCustom ? 'Personalizada' : 'Sistema'}
                            </span>
                          </div>
                        </div>

                        {childIsCustom && (
                          <button
                            onClick={() => handleDeleteCategory(child.id, child.name)}
                            className="p-1 bg-slate-950 border border-slate-850 text-slate-500 hover:text-red-400 rounded-md transition-all cursor-pointer"
                            title="Eliminar subcategoría"
                          >
                            <FiTrash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )
      })
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
            <img src="/icons/market.png" alt="" className="w-7 h-7 object-contain" />
            Categorías y Subcategorías
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Administra la jerarquía de tus ingresos y gastos para clasificar tus movimientos de forma organizada.
          </p>
        </div>
        <button
          onClick={() => {
            setNewCatType('expense')
            setNewCatParentId('')
            setIsAddModalOpen(true)
          }}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-md font-bold text-xs shadow-sm active:scale-[0.99] cursor-pointer"
        >
          <FiPlus className="w-4 h-4" />
          Nueva Categoría / Subcategoría
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="relative max-w-xs">
        <input
          type="text"
          placeholder="Buscar categoría..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-md py-2 px-3 pl-8 text-xs focus:border-emerald-500 outline-none transition-all"
        />
        <FiSearch className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
      </div>

      {/* GRILLAS PRINCIPALES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CATEGORÍAS DE GASTOS */}
        <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-md space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-9 h-9 bg-rose-500/10 text-rose-400 rounded-md flex items-center justify-center">
              <FiTrendingDown className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Categorías de Gastos</h2>
              <p className="text-[10px] text-slate-500">Etiquetas principales y secundarias para tus egresos</p>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {rootExpenseCats.length === 0 ? (
              <p className="text-center text-xs text-slate-500 italic py-8">No hay categorías de gastos.</p>
            ) : (
              renderCategoryTree(rootExpenseCats, false)
            )}
          </div>
        </div>

        {/* CATEGORÍAS DE INGRESOS */}
        <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-md space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <div className="w-9 h-9 bg-emerald-500/10 text-emerald-400 rounded-md flex items-center justify-center">
              <FiTrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Categorías de Ingresos</h2>
              <p className="text-[10px] text-slate-500">Etiquetas principales y secundarias para tus depósitos</p>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {rootIncomeCats.length === 0 ? (
              <p className="text-center text-xs text-slate-500 italic py-8">No hay categorías de ingresos.</p>
            ) : (
              renderCategoryTree(rootIncomeCats, true)
            )}
          </div>
        </div>

      </div>

      {/* MODAL NUEVA CATEGORÍA */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-md p-6 shadow-md relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-455 hover:text-slate-100"
            >
              <FiX className="w-5 h-5" />
            </button>

            <h2 className="text-md font-bold text-slate-100 mb-1">Crear Nueva Categoría o Subcategoría</h2>
            <p className="text-xs text-slate-400 mb-6">
              Agrega una etiqueta para clasificar tus transacciones de forma estructurada.
            </p>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nombre de la Categoría</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Restaurante, Gasolina, Netflix..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tipo de Movimiento</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setNewCatType('expense')
                      setNewCatParentId('') // reset parent on type change
                    }}
                    className={`py-2 px-4 rounded-md text-xs font-bold border transition-all cursor-pointer ${
                      newCatType === 'expense'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-sm'
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    Gasto (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCatType('income')
                      setNewCatParentId('') // reset parent on type change
                    }}
                    className={`py-2 px-4 rounded-md text-xs font-bold border transition-all cursor-pointer ${
                      newCatType === 'income'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm'
                        : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    Ingreso (+)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Categoría Padre (Opcional)</label>
                <select
                  value={newCatParentId}
                  onChange={(e) => setNewCatParentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all cursor-pointer"
                >
                  <option value="">Ninguna (Es una categoría principal)</option>
                  {parentOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[9px] text-slate-500">
                  Selecciona un padre para convertir esta nueva categoría en una subcategoría.
                </p>
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
                  Crear Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
