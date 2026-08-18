'use client'

import React from 'react'
import { resolveCategoryIcon } from '@/lib/categoryIcons'

interface CategoryIconProps {
  icon?: string | null
  name?: string
  type?: 'income' | 'expense'
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'badge' | 'plain' | 'circle'
}

export default function CategoryIcon({
  icon,
  name,
  type,
  className = '',
  size = 'md',
  variant = 'circle'
}: CategoryIconProps) {
  const resolved = resolveCategoryIcon({ name, icon, type })
  const IconComponent = resolved.icon

  // Tamaños del glifo de icono
  const iconSizeClasses = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  }

  // Dimensiones del contenedor redondo
  const containerSizeClasses = {
    xs: 'w-5 h-5 min-w-5',
    sm: 'w-7.5 h-7.5 min-w-7.5',
    md: 'w-9 h-9 min-w-9',
    lg: 'w-11 h-11 min-w-11',
    xl: 'w-13 h-13 min-w-13'
  }

  // Si se solicita sólo el glifo sin fondo
  if (variant === 'plain') {
    return (
      <IconComponent 
        className={`${iconSizeClasses[size]} ${resolved.textClass} ${className}`} 
      />
    )
  }

  return (
    <div 
      className={`rounded-full flex items-center justify-center shrink-0 border transition-all duration-200 shadow-xs ${
        containerSizeClasses[size]
      } ${resolved.bgClass} ${className}`}
    >
      <IconComponent className={`${iconSizeClasses[size]} text-white shrink-0`} />
    </div>
  )
}
