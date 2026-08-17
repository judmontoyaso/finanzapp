'use client'

import React, { useState, useMemo } from 'react'
import { CATEGORY_ICON_LIST, getCategoryIconComponent, detectCategoryIcon } from '@/lib/categoryIcons'
import { FiSearch, FiCheck, FiChevronDown, FiChevronUp } from 'react-icons/fi'

interface CategoryIconPickerProps {
  selectedIcon: string | null
  onSelectIcon: (iconKey: string) => void
  categoryName?: string
  type?: 'income' | 'expense'
  className?: string
}

export default function CategoryIconPicker({
  selectedIcon,
  onSelectIcon,
  categoryName = '',
  type = 'expense',
  className = ''
}: CategoryIconPickerProps) {
  const [search, setSearch] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('Todos')
  const [isOpen, setIsOpen] = useState(false)

  // Extraer grupos únicos
  const groups = useMemo(() => {
    const set = new Set<string>()
    CATEGORY_ICON_LIST.forEach(item => set.add(item.group))
    return ['Todos', ...Array.from(set)]
  }, [])

  // Icono sugerido o resuelto
  const effectiveIconKey = useMemo(() => {
    if (selectedIcon) return selectedIcon
    if (categoryName.trim()) {
      return detectCategoryIcon(categoryName, type)
    }
    return type === 'income' ? 'wallet' : 'folder'
  }, [selectedIcon, categoryName, type])

  const EffectiveIcon = getCategoryIconComponent(effectiveIconKey)
  const currentIconItem = CATEGORY_ICON_LIST.find(i => i.key === effectiveIconKey)

  // Filtrado de lista por búsqueda y grupo
  const filteredIcons = useMemo(() => {
    const q = search.toLowerCase().trim()
    return CATEGORY_ICON_LIST.filter(item => {
      const matchesGroup = selectedGroup === 'Todos' || item.group === selectedGroup
      if (!q) return matchesGroup

      const matchesSearch = 
        item.label.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q) ||
        item.keywords.some(kw => kw.includes(q) || q.includes(kw))

      return matchesGroup && matchesSearch
    })
  }, [search, selectedGroup])

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-300">
          Icono Representativo
        </label>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
        >
          {isOpen ? (
            <>
              Ocultar catálogo <FiChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Cambiar icono <FiChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Botón de vista previa del icono seleccionado */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-md p-2.5 cursor-pointer transition-all group"
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${
          type === 'income'
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 group-hover:scale-105'
            : 'bg-rose-500/15 border-rose-500/30 text-rose-400 group-hover:scale-105'
        }`}>
          <EffectiveIcon className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-xs font-bold text-slate-200 block truncate">
            {currentIconItem?.label || 'Icono asignado'}
          </span>
          <span className="text-[10px] text-slate-500 block truncate">
            {selectedIcon ? 'Icono personalizado' : 'Sugerido automáticamente por nombre'}
          </span>
        </div>
        <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-1 rounded text-slate-400 font-medium">
          {isOpen ? 'Cerrar' : 'Elegir'}
        </span>
      </div>

      {/* Catálogo expandible de iconos */}
      {isOpen && (
        <div className="bg-slate-950 border border-slate-800 rounded-md p-3.5 space-y-3 animate-fadeIn shadow-lg">
          {/* Buscador de iconos */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar icono (ej. comida, taxi, cine, casa, médico)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 rounded-md py-1.5 pl-8 pr-3 text-xs focus:border-emerald-500 outline-none"
            />
            <FiSearch className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>

          {/* Filtros por grupo */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-[10px]">
            {groups.map(grp => (
              <button
                key={grp}
                type="button"
                onClick={() => setSelectedGroup(grp)}
                className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedGroup === grp
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {grp}
              </button>
            ))}
          </div>

          {/* Rejilla de iconos */}
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {filteredIcons.map((item) => {
              const IconComp = item.icon
              const isSelected = effectiveIconKey === item.key

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onSelectIcon(item.key)
                    setIsOpen(false)
                  }}
                  title={item.label}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all cursor-pointer group relative ${
                    isSelected
                      ? type === 'income'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/40 shadow-sm'
                        : 'bg-rose-500/20 border-rose-500 text-rose-300 ring-2 ring-rose-500/40 shadow-sm'
                      : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:text-slate-100 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <IconComp className="w-4 h-4 group-hover:scale-115 transition-transform" />
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-xs">
                      <FiCheck className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {filteredIcons.length === 0 && (
            <p className="text-center text-xs text-slate-500 italic py-4">
              No se encontraron iconos que coincidan con &quot;{search}&quot;.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
