'use client'

import React from 'react'
import { resolveCategoryIcon } from '@/lib/categoryIcons'

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
  const IconComponent = resolved.icon

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
        className={`${iconSizeClasses[size]} ${resolved.textClass} ${className}`} 
      />
    )
  }

  const containerSizeClasses = {
    xs: 'w-5 h-5 rounded',
    sm: 'w-7 h-7 rounded-md',
    md: 'w-8 h-8 rounded-lg',
    lg: 'w-10 h-10 rounded-xl'
  }

  return (
    <div 
      className={`flex items-center justify-center flex-shrink-0 border transition-transform shadow-xs ${
        variant === 'circle' ? 'rounded-full' : containerSizeClasses[size]
      } ${resolved.bgClass} ${className}`}
    >
      <IconComponent className={iconSizeClasses[size]} />
    </div>
  )
}
