'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FiPlus } from 'react-icons/fi'

export const MOBILE_TABS = [
  { label: 'Inicio', path: '/dashboard', icon: '/icons/wallet.png' },
  { label: 'Movimientos', path: '/transactions', icon: '/icons/money-flow.png' },
  // El botón + va en el centro de forma especial
  { label: 'Reportes', path: '/reports', icon: '/icons/report.png' },
  { label: 'Presupuestos', path: '/budgets', icon: '/icons/planning.png' },
]

export default function MobileTabBar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleQuickAdd = () => {
    if (pathname === '/transactions') {
      // Disparar evento para abrir modal directamente
      window.dispatchEvent(new Event('finanzas_open_add_transaction'))
    } else {
      // Redirigir a transacciones con parámetro para abrir modal
      router.push('/transactions?add=true')
    }
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900 border-t border-slate-800 shadow-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16 relative px-2">
        {/* Renderiza los dos primeros tabs */}
        {MOBILE_TABS.slice(0, 2).map((tab) => {
          const active = pathname === tab.path
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`flex flex-col items-center justify-center flex-1 min-w-0 transition-colors py-1 cursor-pointer ${
                active ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              <img
                src={tab.icon}
                alt={tab.label}
                className={`w-5 h-5 object-contain mb-1 transition-transform ${
                  active ? 'scale-110 opacity-100' : 'opacity-60'
                }`}
              />
              <span className="text-[10px] font-medium truncate">{tab.label}</span>
            </Link>
          )
        })}

        {/* Botón flotante central FAB */}
        <div className="flex-1 flex justify-center -mt-6 z-50">
          <button
            onClick={handleQuickAdd}
            className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer border-4 border-slate-900"
            title="Nueva transacción"
          >
            <FiPlus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Renderiza los dos últimos tabs */}
        {MOBILE_TABS.slice(2).map((tab) => {
          const active = pathname === tab.path
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`flex flex-col items-center justify-center flex-1 min-w-0 transition-colors py-1 cursor-pointer ${
                active ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              <img
                src={tab.icon}
                alt={tab.label}
                className={`w-5 h-5 object-contain mb-1 transition-transform ${
                  active ? 'scale-110 opacity-100' : 'opacity-60'
                }`}
              />
              <span className="text-[10px] font-medium truncate">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
