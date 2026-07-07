'use client'

import { useState, useEffect, useCallback } from 'react'
import { LocalDB } from '@/lib/db'
import { ReportSettings } from '@/types'
import { toast } from 'react-hot-toast'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [wsName, setWsName] = useState('')
  const [settings, setSettings] = useState<ReportSettings | null>(null)

  const [enabled, setEnabled] = useState(true)
  const [period, setPeriod] = useState(15)
  const [nextRun, setNextRun] = useState('')

  const load = useCallback(async () => {
    try {
      const overview = await LocalDB.getWorkspacesOverview()
      const activeId = LocalDB.getActiveWorkspaceId()
      const active = overview.find((w) => w.id === activeId)
      setIsOwner(active?.isOwner ?? false)
      setWsName(active?.name || '')
      let s: ReportSettings | null = null
      try {
        s = await LocalDB.getReportSettings()
      } catch {}
      setSettings(s)
      setEnabled(s?.enabled ?? true)
      setPeriod(s?.period_days ?? 15)
      setNextRun(s?.next_run || new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    window.addEventListener('finanzas_data_changed', load)
    return () => window.removeEventListener('finanzas_data_changed', load)
  }, [load])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await LocalDB.saveReportSettings({ enabled, period_days: period, next_run: nextRun })
      toast.success('Configuración guardada')
      setSettings({ workspace_id: '', enabled, period_days: period, next_run: nextRun })
    } catch {
      toast.error('Error al guardar. ¿Corriste report-settings.sql?')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <svg className="animate-spin h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">Configuración</h1>
        <p className="text-slate-400 text-xs mt-1">Ajustes del espacio <span className="text-slate-300 font-semibold">{wsName}</span>.</p>
      </div>

      {/* Reportes por IA */}
      <div className="bg-slate-900 border border-slate-800 rounded-md p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-800">
          <img src="/icons/report.png" alt="" className="w-9 h-9 object-contain" />
          <div>
            <h2 className="text-sm font-bold text-slate-100">Reportes financieros por IA</h2>
            <p className="text-[11px] text-slate-500">Análisis y recomendaciones por correo, automáticamente.</p>
          </div>
        </div>

        {!isOwner ? (
          <p className="text-xs text-slate-400">
            {settings?.enabled
              ? `Activo · cada ${settings.period_days} días.`
              : 'Sin reportes automáticos.'} Solo el dueño del espacio puede cambiar esta configuración.
          </p>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <label className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-md px-3 py-2.5 cursor-pointer">
              <span className="text-xs font-semibold text-slate-200">Activar reportes automáticos</span>
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-emerald-500 w-4 h-4" />
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Frecuencia</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ d: 7, l: 'Semanal' }, { d: 15, l: 'Cada 15 días' }, { d: 30, l: 'Mensual' }].map((o) => (
                  <button
                    key={o.d}
                    type="button"
                    onClick={() => setPeriod(o.d)}
                    className={`py-2 rounded-md border text-[10px] font-bold transition-all cursor-pointer ${period === o.d ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-100'}`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-slate-500">o personalizado:</span>
                <input type="number" min="1" value={period} onChange={(e) => setPeriod(parseInt(e.target.value) || 15)} className="w-20 bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-1.5 px-2 text-xs outline-none focus:border-emerald-500" />
                <span className="text-[10px] text-slate-500">días</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Próximo envío (fecha de corte)</label>
              <input type="date" required value={nextRun} onChange={(e) => setNextRun(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs outline-none focus:border-emerald-500" />
              <p className="text-[10px] text-slate-500 mt-1">A partir de esta fecha, cada {period} días.</p>
            </div>

            <div className="flex justify-end">
              <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-all">Guardar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
