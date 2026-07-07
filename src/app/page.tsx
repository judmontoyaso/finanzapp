'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { FiArrowRight } from 'react-icons/fi'
import LogoMark from '@/components/LogoMark'

export default function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      setLoading(false)
    }
    checkSession()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between">
      
      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-5 flex justify-between items-center border-b border-slate-900">
        <div className="flex items-center gap-2.5">
          <LogoMark className="w-8 h-8" />
          <span className="text-md font-bold tracking-tight text-slate-100">
            Arca<span className="text-emerald-500">Finanzas</span>
          </span>
        </div>
        
        <div>
          {loading ? (
            <span className="text-xs text-slate-500 font-semibold">Cargando...</span>
          ) : isAuthenticated ? (
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-xs transition-all duration-150 active:scale-[0.99]"
            >
              Ir al Panel
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-350 rounded-md font-bold text-xs transition-all duration-150 active:scale-[0.99]"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 pt-16 pb-20 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 text-slate-400 rounded-md text-[10px] font-bold mb-6 uppercase tracking-wider">
          Espacios · Presupuestos · Metas · Recurrentes
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-100 leading-tight mb-6">
          Toma el control absoluto de tus <span className="text-emerald-500">Finanzas Diarias</span>
        </h1>
        
        {/* Subhead */}
        <p className="text-slate-400 text-sm md:text-base max-w-xl leading-relaxed mb-10">
          Establece presupuestos por categorías, visualiza tus gastos e ingresos con gráficos interactivos y gestiona múltiples espacios de trabajo separados para tus negocios.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-16">
          <Link
            href={isAuthenticated ? "/dashboard" : "/login"}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-sm shadow-sm active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2"
          >
            <span>{isAuthenticated ? 'Ir al Dashboard' : 'Comenzar Gratis'}</span>
            <FiArrowRight />
          </Link>
          <a
            href="#features"
            className="px-6 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-md font-bold text-sm active:scale-[0.99] transition-all duration-150"
          >
            Ver Características
          </a>
        </div>

        {/* Mockup Dashboard Preview */}
        <div className="relative w-full max-w-3xl rounded-md border border-slate-800 bg-slate-900 p-4 shadow-sm text-left">
          <div className="flex gap-1.5 mb-4 border-b border-slate-800 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-800"></span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="bg-slate-950 p-4 rounded-md border border-slate-800/60">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Ingresos Mensuales</span>
              <p className="text-lg font-black text-emerald-450 mt-1">$3,650.00</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-md border border-slate-800/60">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Gastos Mensuales</span>
              <p className="text-lg font-black text-rose-455 mt-1">$1,420.00</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-md border border-slate-800/60">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Balance Neto</span>
              <p className="text-lg font-black text-teal-450 mt-1">$2,230.00</p>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto w-full px-6 py-16 border-t border-slate-900">
        <h2 className="text-xl font-bold text-center text-slate-100 uppercase tracking-wider mb-12">
          Características Principales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-md shadow-sm">
            <div className="w-12 h-12 bg-slate-800/50 rounded-md flex items-center justify-center mb-5">
              <img src="/icons/report.png" alt="" className="w-8 h-8 object-contain" />
            </div>
            <h3 className="text-md font-bold mb-2 text-slate-100">Gráficos Analíticos</h3>
            <p className="text-slate-400 leading-relaxed text-xs">
              Visualiza tus tendencias de gastos e ingresos con gráficos interactivos responsivos que se adaptan a tus espacios de trabajo.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-md shadow-sm">
            <div className="w-12 h-12 bg-slate-800/50 rounded-md flex items-center justify-center mb-5">
              <img src="/icons/planning.png" alt="" className="w-8 h-8 object-contain" />
            </div>
            <h3 className="text-md font-bold mb-2 text-slate-100">Control de Presupuestos</h3>
            <p className="text-slate-400 leading-relaxed text-xs">
              Define presupuestos mensuales límite por cada categoría de gasto y observa barras de progreso de color adaptativas.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-md shadow-sm">
            <div className="w-12 h-12 bg-slate-800/50 rounded-md flex items-center justify-center mb-5">
              <img src="/icons/wallet.png" alt="" className="w-8 h-8 object-contain" />
            </div>
            <h3 className="text-md font-bold mb-2 text-slate-100">Soporte PWA</h3>
            <p className="text-slate-400 leading-relaxed text-xs">
              Instala la aplicación en tu celular para tener un acceso rápido como una app nativa, con caché fuera de línea y alta velocidad.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-[10px] text-slate-500 w-full">
        © 2026 Arca Finanzas. Todos los derechos reservados.
      </footer>
    </div>
  )
}