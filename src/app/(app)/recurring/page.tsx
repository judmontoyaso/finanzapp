'use client'

import { useState, useEffect, useCallback } from 'react'
import { LocalDB } from '@/lib/db'
import { Category, RecurringTransaction, RecurringFrequency } from '@/types'
import { toast } from 'react-hot-toast'
import { FiPlus, FiX, FiEdit, FiTrash2, FiCheck, FiClock, FiRepeat } from 'react-icons/fi'

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  yearly: 'Anual',
}

const emptyForm = {
  description: '',
  amount: '',
  type: 'expense' as 'income' | 'expense',
  category_id: '',
  frequency: 'monthly' as RecurringFrequency,
  next_date: new Date().toISOString().split('T')[0],
}

export default function RecurringPage() {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([])
  const [due, setDue] = useState<RecurringTransaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const loadData = useCallback(async () => {
    try {
      const [rec, cats] = await Promise.all([LocalDB.getRecurring(), LocalDB.getCategories()])
      setRecurring(rec)
      setCategories(cats)
      const today = new Date().toISOString().split('T')[0]
      setDue(rec.filter((r) => r.active && r.next_date <= today))
    } catch (e) {
      console.error('Error cargando recurrentes', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    window.addEventListener('finanzas_data_changed', loadData)
    return () => window.removeEventListener('finanzas_data_changed', loadData)
  }, [loadData])

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name || 'Sin categoría'

  const openNew = () => {
    setEditingId(null)
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  const openEdit = (r: RecurringTransaction) => {
    setEditingId(r.id)
    setForm({
      description: r.description,
      amount: String(r.amount),
      type: r.type,
      category_id: r.category_id || '',
      frequency: r.frequency,
      next_date: r.next_date,
    })
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!form.description.trim() || isNaN(amount) || amount <= 0) {
      toast.error('Completa descripción y monto válido')
      return
    }
    const payload = {
      description: form.description.trim(),
      amount,
      type: form.type,
      category_id: form.category_id || null,
      frequency: form.frequency,
      next_date: form.next_date,
    }
    try {
      if (editingId) {
        await LocalDB.updateRecurring(editingId, payload)
        toast.success('Recurrente actualizada')
      } else {
        await LocalDB.addRecurring(payload)
        toast.success('Recurrente creada')
      }
      setIsModalOpen(false)
    } catch {
      toast.error('Error al guardar')
    }
  }

  const handleConfirm = async (r: RecurringTransaction) => {
    try {
      await LocalDB.confirmRecurring(r)
      toast.success(`Registrada: ${r.description}`)
    } catch {
      toast.error('Error al confirmar')
    }
  }

  const handleSkip = async (r: RecurringTransaction) => {
    try {
      await LocalDB.skipRecurring(r)
      toast.success('Pospuesta al siguiente periodo')
    } catch {
      toast.error('Error al posponer')
    }
  }

  const handleToggleActive = async (r: RecurringTransaction) => {
    try {
      await LocalDB.updateRecurring(r.id, { active: !r.active })
    } catch {
      toast.error('Error al actualizar')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await LocalDB.deleteRecurring(id)
      toast.success('Recurrente eliminada')
    } catch {
      toast.error('Error al eliminar')
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Transacciones Recurrentes</h1>
          <p className="text-slate-400 text-xs mt-1">
            Plantillas de ingresos y gastos que se repiten. Te preguntamos antes de registrar cada una.
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-md font-bold text-xs transition-all duration-150 active:scale-[0.99]"
        >
          <FiPlus className="w-4 h-4" /> Nueva Recurrente
        </button>
      </div>

      {/* PENDIENTES POR CONFIRMAR */}
      {due.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-md p-5">
          <div className="flex items-center gap-2 mb-4">
            <FiClock className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
              Pendientes por confirmar ({due.length})
            </h2>
          </div>
          <div className="space-y-2">
            {due.map((r) => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-900 border border-slate-800 rounded-md p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-100 truncate">{r.description}</p>
                  <p className="text-[10px] text-slate-500">
                    {catName(r.category_id)} · {FREQ_LABELS[r.frequency]} · vence {new Date(r.next_date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
                <span className={`text-sm font-bold whitespace-nowrap ${r.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {r.type === 'income' ? '+' : '-'}${r.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirm(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold transition-all"
                  >
                    <FiCheck className="w-3 h-3" /> Confirmar
                  </button>
                  <button
                    onClick={() => handleSkip(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 rounded-md text-[10px] font-bold transition-all"
                  >
                    Posponer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LISTA DE RECURRENTES */}
      {recurring.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-md p-10 text-center">
          <FiRepeat className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-semibold">Aún no tienes transacciones recurrentes.</p>
          <p className="text-xs text-slate-500 mt-1">Crea una para el salario, el arriendo o tus suscripciones.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recurring.map((r) => (
            <div key={r.id} className={`bg-slate-900 border rounded-md p-5 shadow-sm ${r.active ? 'border-slate-800' : 'border-slate-800 opacity-60'}`}>
              <div className="flex justify-between items-start mb-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-100 text-sm truncate">{r.description}</h3>
                  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold mt-1 border border-slate-800 bg-slate-950 text-slate-400">
                    {FREQ_LABELS[r.frequency]}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(r)} className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-md hover:bg-slate-800 transition-all cursor-pointer" title="Editar">
                    <FiEdit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md hover:bg-slate-800 transition-all cursor-pointer" title="Eliminar">
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-baseline justify-between mb-3">
                <span className={`text-lg font-extrabold ${r.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {r.type === 'income' ? '+' : '-'}${r.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-500">{catName(r.category_id)}</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <span className="text-[10px] text-slate-500 font-semibold">
                  Próxima: {new Date(r.next_date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <button
                  onClick={() => handleToggleActive(r)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer ${r.active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-slate-800'}`}
                >
                  {r.active ? 'Activa' : 'Pausada'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL AÑADIR / EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-md p-6 shadow-md relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 cursor-pointer">
              <FiX className="w-5 h-5" />
            </button>
            <h2 className="text-md font-bold text-slate-100 mb-5">{editingId ? 'Editar Recurrente' : 'Nueva Recurrente'}</h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Descripción</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Salario, Netflix, Arriendo..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Monto ($)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as 'income' | 'expense', category_id: '' })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="expense">Gasto</option>
                    <option value="income">Ingreso</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Categoría</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all cursor-pointer"
                >
                  <option value="">Sin categoría</option>
                  {categories.filter((c) => c.type === form.type).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Frecuencia</label>
                  <select
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value as RecurringFrequency })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quincenal</option>
                    <option value="monthly">Mensual</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Próxima fecha</label>
                  <input
                    type="date"
                    required
                    value={form.next_date}
                    onChange={(e) => setForm({ ...form, next_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 rounded-md text-xs font-semibold transition-all">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-all">
                  {editingId ? 'Guardar cambios' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
