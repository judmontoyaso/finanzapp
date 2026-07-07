'use client'

import { useId } from 'react'

// Marca de Arca Finanzas: barras ascendentes + flecha de crecimiento sobre
// tile esmeralda. Id de gradiente único por instancia (useId) para que
// varios logos en la página no se pisen.
export default function LogoMark({ className = 'w-6 h-6' }: { className?: string }) {
  const gid = `arca-${useId()}`
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={`url(#${gid})`} />
      <rect x="9.4" y="18.75" width="2.9" height="5" rx="0.9" fill="#ffffff" opacity="0.55" />
      <rect x="14.55" y="15.6" width="2.9" height="8.15" rx="0.9" fill="#ffffff" opacity="0.78" />
      <rect x="19.7" y="12.5" width="2.9" height="11.25" rx="0.9" fill="#ffffff" />
      <path d="M9.4 15.6 L14.4 12.5 L18.75 9.4" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.4 9.4 H18.75 V11.75" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
    </svg>
  )
}
