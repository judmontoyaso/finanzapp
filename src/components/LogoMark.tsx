// Marca de Arca Finanzas: tile esmeralda con una "A" ascendente (crecimiento).
// Autocontenida y escalable vía className (ancho/alto).
export default function LogoMark({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="url(#arca-g)" />
      <path d="M9 23 L16 9 L23 23" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.3 18.4 H19.7" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" />
      <defs>
        <linearGradient id="arca-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
    </svg>
  )
}
