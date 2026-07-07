// Logo de Arca Finanzas (imagen libreta + calculadora). Escalable vía className.
export default function LogoMark({ className = 'w-6 h-6' }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="Arca Finanzas" className={`${className} object-contain`} />
}
