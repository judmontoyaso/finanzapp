'use client'

import { useEffect, useState } from 'react'
import { FiSun, FiMoon } from 'react-icons/fi'

export default function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const stored = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
    setTheme(stored)
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem('theme', next)
    } catch {}
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  const isDark = theme === 'dark'
  const label = isDark ? 'Modo claro' : 'Modo oscuro'

  return (
    <button
      onClick={toggle}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-all cursor-pointer border-t border-slate-800 ${collapsed ? 'justify-center' : ''}`}
    >
      {isDark ? <FiSun className="w-4 h-4 flex-shrink-0" /> : <FiMoon className="w-4 h-4 flex-shrink-0" />}
      {!collapsed && <span className="text-[10px] font-semibold">{label}</span>}
    </button>
  )
}
