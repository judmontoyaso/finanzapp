'use client'

import React from 'react'
import { resolveCategoryIcon, getCategoryIconComponent } from '@/lib/categoryIcons'

interface CategoryIconProps {
  icon?: string | null
  name?: string
  type?: 'income' | 'expense'
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'badge' | 'plain' | 'circle'
}

export default function CategoryIcon({
  icon,
  name,
  type,
  className = '',
  size = 'md',
  variant = 'badge'
}: CategoryIconProps) {
  const resolved = resolveCategoryIcon({ name, icon, type })
  const IconComponent = icon ? getCategoryIconComponent(icon) : resolved.Icon

  const isIncome = type === 'income'

  // Tamaños de icono
  const iconSizeClasses = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  // Contenedores por variante
  if (variant === 'plain') {
    return (
      <IconComponent 
        className={`${iconSizeClasses[size]} ${isIncome ? 'text-emerald-400' : 'text-rose-400'} ${className}`} 
      />
    )
  }

  const containerSizeClasses = {
    xs: 'w-5 h-5 rounded',
    sm: 'w-7 h-7 rounded-md',
    md: 'w-8 h-8 rounded-lg',
    lg: 'w-10 h-10 rounded-xl'
  }

  const colorClasses = isIncome 
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'

  return (
    <div 
      className={`flex items-center justify-center flex-shrink-0 border transition-transform shadow-xs ${
        variant === 'circle' ? 'rounded-full' : containerSizeClasses[size]
      } ${colorClasses} ${className}`}
    >
      <IconComponent className={iconSizeClasses[size]} />
    </div>
  )
}
