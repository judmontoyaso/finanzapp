'use client'

import { useState, useEffect } from 'react'
import { LocalDB } from '@/lib/db'
import { SavingsGoal } from '@/types'
import { 
  FiPlus, 
  FiDownload, 
  FiUpload, 
  FiTrash2, 
  FiX, 
  FiArrowUpRight, 
  FiArrowDownLeft 
} from 'react-icons/fi'
import { toast } from 'react-hot-toast'

export default function SavingsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modales
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [activeGoal, setActiveGoal] = useState<SavingsGoal | null>(null)
  const [actionType, setActionType] = useState<'contribute' | 'withdraw' | null>(null)
  
  // Campos del formulario
  const [newGoalName, setNewGoalName] = useState('')
  const [newGoalTarget, setNewGoalTarget] = useState('')
  const [newGoalDate, setNewGoalDate] = useState('')
  const [actionAmount, setActionAmount] = useState('')

  // Cargar datos
  const loadData = async () => {
    try {
      const gList = await LocalDB.getSavingsGoals()
      setGoals(gList)
    } catch {
      console.error('Error cargando metas de ahorro')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    window.addEventListener('finanzas_data_changed', loadData)
    return () => window.removeEventListener('finanzas_data_changed', loadData)
  }, [])

  // Estadísticas globales
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0)
  const totalCurrent = goals.reduce((sum, g) => sum + g.current_amount, 0)
  const overallPercent = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0

  // --- ACCIONES METAS ---
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = parseFloat(newGoalTarget)
    if (!newGoalName.trim() || isNaN(target) || target <= 0) return

    try {
      await LocalDB.addSavingsGoal(newGoalName.trim(), target, newGoalDate || undefined)
      setNewGoalName('')
      setNewGoalTarget('')
      setNewGoalDate('')
      setIsAddOpen(false)
      toast.success('Meta de ahorro creada con éxito')
    } catch {
      toast.error('Error al agregar meta de ahorro')
    }
  }

  const handleOpenAction = (goal: SavingsGoal, type: 'contribute' | 'withdraw') => {
    setActiveGoal(goal)
    setActionType(type)
    setActionAmount('')
  }

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeGoal || !actionType) return
    
    const amount = parseFloat(actionAmount)
    if (isNaN(amount) || amount <= 0) return

    try {
      await LocalDB.adjustSavingsGoalAmount(activeGoal.id, amount, actionType === 'contribute')
      setActiveGoal(null)
      setActionType(null)
      setActionAmount('')
      toast.success(actionType === 'contribute' ? 'Aporte registrado con éxito' : 'Retiro registrado con éxito')
    } catch {
      toast.error('Error al realizar el movimiento de ahorro')
    }
  }

  const handleDeleteGoal = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar la meta de ahorro "${name}"?`)) {
      try {
        await LocalDB.deleteSavingsGoal(id)
        toast.success('Meta de ahorro eliminada')
      } catch {
        toast.error('Error al eliminar la meta')
      }
    }
  }

  // --- CONFIGURACIÓN DE BACKUP JSON ---
  const handleExportJSON = async () => {
    try {
      const dataStr = await LocalDB.exportAllDataJSON()
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `respaldo_finanzas_${new Date().toISOString().slice(0, 10)}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
      toast.success('Respaldo exportado con éxito')
    } catch {
      toast.error('Error al exportar copia de seguridad')
    }
  }

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const fileReader = new FileReader()
    fileReader.onload = async (event) => {
      const result = event.target?.result
      if (typeof result === 'string') {
        const success = await LocalDB.importAllDataJSON(result)
        if (success) {
          toast.success('¡Copia de seguridad importada con éxito!')
        } else {
          toast.error('Error: El archivo no contiene un formato válido.')
        }
      }
    }
    fileReader.readAsText(files[0])
    e.target.value = ''
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
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Metas de Ahorro</h1>
          <p className="text-slate-400 text-xs mt-1">
            Planea compras, fondos de emergencia o inversiones para tus futuros negocios.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-md font-bold text-xs shadow-sm active:scale-[0.99] cursor-pointer"
        >
          <FiPlus className="w-4 h-4" />
          Nueva Meta
        </button>
      </div>

      {/* RESUMEN GLOBAL DE AHORROS */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-sm relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Objetivo Acumulado</span>
            <p className="text-2xl font-extrabold text-slate-100 mt-1">
              ${totalTarget.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Monto Ahorrado</span>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">
              ${totalCurrent.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Progreso Global</span>
            <p className="text-2xl font-extrabold text-teal-400 mt-1">
              {overallPercent.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Progreso horizontal */}
        {totalTarget > 0 && (
          <div className="mt-5 space-y-1.5">
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{ width: `${Math.min(overallPercent, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 font-semibold">
              <span>0% ahorrado</span>
              <span>100% completado</span>
            </div>
          </div>
        )}
      </div>

      {/* METAS DE AHORRO LISTADO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {goals.length === 0 ? (
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-md p-10 text-center text-slate-500">
            <h3 className="text-xs font-bold text-slate-100 mb-1">Crea tu primera meta de ahorro</h3>
            <p className="text-xs max-w-sm mx-auto mb-4 text-slate-500">Establece un propósito, una cifra objetivo y aporta dinero periódicamente para alcanzarla.</p>
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-3.5 py-2 bg-slate-950 border border-slate-850 hover:bg-slate-900 text-emerald-500 rounded-md text-[10px] font-bold transition-all cursor-pointer"
            >
              Fijar Meta de Ahorro
            </button>
          </div>
        ) : (
          goals.map((g) => {
            const percent = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0
            const displayPercent = Math.min(percent, 100)
            
            const r = 30
            const c = 2 * Math.PI * r
            const strokeDashOffset = c - (displayPercent * c) / 100

            return (
              <div
                key={g.id}
                className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-6"
              >
                {/* Detalles de la meta */}
                <div className="flex-1 space-y-3.5 text-center sm:text-left w-full">
                  <div>
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <h3 className="font-bold text-slate-100 text-sm">{g.name}</h3>
                      {percent >= 100 && (
                        <span className="text-[9px] font-black uppercase tracking-wide text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-1.5 py-0.5">Completada</span>
                      )}
                    </div>
                    {g.target_date && (
                      <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                        Límite: {new Date(g.target_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2.5 border-t border-b border-slate-805 my-2.5 text-xs font-semibold">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Ahorrado</span>
                      <span className="text-sm font-bold block mt-0.5 text-emerald-450">
                        ${g.current_amount.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Objetivo</span>
                      <span className="text-sm font-bold block mt-0.5 text-slate-350">
                        ${g.target_amount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Acciones Rápidas */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleOpenAction(g, 'contribute')}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-450 border border-emerald-500/20 rounded-md text-[10px] font-bold active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <FiArrowUpRight /> Aportar
                    </button>
                    <button
                      onClick={() => handleOpenAction(g, 'withdraw')}
                      disabled={g.current_amount <= 0}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-850 rounded-md text-[10px] font-bold active:scale-[0.99] transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <FiArrowDownLeft /> Retirar
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(g.id, g.name)}
                      className="p-1.5 bg-slate-950 border border-slate-850 hover:bg-red-950/40 text-slate-500 hover:text-red-400 rounded-md transition-all cursor-pointer"
                      title="Eliminar Meta"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* SVG circular */}
                <div className="w-24 h-24 relative flex items-center justify-center flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r={r}
                      fill="transparent"
                      stroke="#1e293b"
                      strokeWidth="5"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r={r}
                      fill="transparent"
                      stroke="#10b981"
                      strokeWidth="5"
                      strokeDasharray={c}
                      strokeDashoffset={strokeDashOffset}
                      strokeLinecap="round"
                      className="transition-all duration-300"
                    />
                  </svg>
                  <div className="absolute">
                    <span className="text-xs font-black text-slate-100">{percent.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* COPIA DE SEGURIDAD */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-md">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-2">Copia de Seguridad y Respaldos</h3>
        <p className="text-[10px] text-slate-400 mb-6">
          Exporta tu base de datos local en formato JSON para transferirla a otros navegadores o guardarla como respaldo.
        </p>

        <div className="flex flex-col sm:flex-row gap-3.5 items-center">
          <button
            onClick={handleExportJSON}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-300 px-4 py-3 rounded-md font-bold text-xs shadow-sm active:scale-[0.99] transition-all cursor-pointer"
          >
            <FiDownload className="w-4 h-4" />
            Exportar Respaldo (JSON)
          </button>

          <div className="relative w-full sm:w-auto">
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <button
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-300 px-4 py-3 rounded-md font-bold text-xs shadow-sm active:scale-[0.99] transition-all cursor-pointer"
            >
              <FiUpload className="w-4 h-4" />
              Importar Respaldo (JSON)
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: CREAR META */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-md p-6 shadow-md relative">
            <button
              onClick={() => setIsAddOpen(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-100"
            >
              <FiX className="w-5 h-5" />
            </button>

            <h2 className="text-md font-bold text-slate-100 mb-2">Crear Meta de Ahorro</h2>
            <p className="text-xs text-slate-400 mb-6">Fija una meta de dinero para tus inversiones o planes futuros.</p>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nombre del Propósito</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Fondo de Emergencia, Inversión Negocio..."
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Monto Objetivo ($)</label>
                  <input
                    type="number"
                    required
                    step="1"
                    placeholder="0.00"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Fecha Límite</label>
                  <input
                    type="date"
                    value={newGoalDate}
                    onChange={(e) => setNewGoalDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-350 rounded-md text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-all"
                >
                  Crear Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ACCIÓN DE APORTAR/RETIRAR */}
      {activeGoal && actionType && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-md p-6 shadow-md relative">
            <button
              onClick={() => { setActiveGoal(null); setActionType(null); }}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-100"
            >
              <FiX className="w-5 h-5" />
            </button>

            <h2 className="text-md font-bold text-slate-100 mb-2">
              {actionType === 'contribute' ? 'Aportar Ahorro' : 'Retirar Ahorro'}
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Meta: <span className="text-emerald-555 font-bold">{activeGoal.name}</span>. Ahorro actual: ${activeGoal.current_amount.toLocaleString()}.
            </p>

            <form onSubmit={handleExecuteAction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Monto ($)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  placeholder="0.00"
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setActiveGoal(null); setActionType(null); }}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-350 rounded-md text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-all"
                >
                  Confirmar {actionType === 'contribute' ? 'Aporte' : 'Retiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
