import {
  FaBuildingColumns,
  FaMobileScreen,
  FaMoneyBillWave,
  FaCreditCard,
  FaPiggyBank,
  FaArrowTrendUp,
  FaWallet,
  FaShop,
  FaHouse
} from 'react-icons/fa6'
import type { IconType } from 'react-icons'
import type { WorkspaceType } from '@/lib/db'

export const WS_TYPES: { value: WorkspaceType; label: string; Icon: IconType; hint: string }[] = [
  { value: 'personal', label: 'Personal / Billetera', Icon: FaWallet, hint: 'Cuentas personales o billetera principal' },
  { value: 'home', label: 'Hogar / Familia', Icon: FaHouse, hint: 'Gastos y presupuesto del hogar en familia' },
  { value: 'business', label: 'Negocio / Emprendimiento', Icon: FaShop, hint: 'Ventas, nómina, compras y proveedores' },
  { value: 'other', label: 'Cuenta / Bolsillo', Icon: FaBuildingColumns, hint: 'Cuenta bancaria, bolsillo o inversión' },
]

export const wsTypeMeta = (t?: string) => WS_TYPES.find((x) => x.value === t) || WS_TYPES[3]

/**
 * Reconoce el tipo de cuenta/bolsillo según el nombre y tipo del espacio de trabajo
 */
export function getWorkspaceAccountMeta(name: string, type?: string) {
  const n = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  if (n.includes('nequi') || n.includes('daviplata') || n.includes('movil') || n.includes('celular') || n.includes('billetera virtual') || n.includes('app')) {
    return {
      label: 'Billetera Móvil',
      Icon: FaMobileScreen,
      colorClass: 'text-purple-400 bg-purple-500/15 border-purple-500/30'
    }
  }

  if (n.includes('efectivo') || n.includes('cash') || n.includes('plata') || n.includes('billetera') || n.includes('bolsillo efectivo')) {
    return {
      label: 'Efectivo / Cash',
      Icon: FaMoneyBillWave,
      colorClass: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
    }
  }

  if (n.includes('tarjeta') || n.includes('credito') || n.includes('debito') || n.includes('card') || n.includes('visa') || n.includes('mastercard') || n.includes('amex')) {
    return {
      label: 'Tarjeta de Crédito / Débito',
      Icon: FaCreditCard,
      colorClass: 'text-amber-400 bg-amber-500/15 border-amber-500/30'
    }
  }

  if (n.includes('banco') || n.includes('bancolombia') || n.includes('davivienda') || n.includes('bbva') || n.includes('bogota') || n.includes('occidente') || n.includes('cuenta') || n.includes('corriente')) {
    return {
      label: 'Cuenta Bancaria',
      Icon: FaBuildingColumns,
      colorClass: 'text-blue-400 bg-blue-500/15 border-blue-500/30'
    }
  }

  if (n.includes('ahorro') || n.includes('alcancia') || n.includes('piggy') || n.includes('reserva') || n.includes('fondo')) {
    return {
      label: 'Cuenta de Ahorros',
      Icon: FaPiggyBank,
      colorClass: 'text-pink-400 bg-pink-500/15 border-pink-500/30'
    }
  }

  if (n.includes('inversion') || n.includes('fiducia') || n.includes('cdt') || n.includes('bolsa') || n.includes('crypto') || n.includes('acciones')) {
    return {
      label: 'Inversión / Rentabilidad',
      Icon: FaArrowTrendUp,
      colorClass: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
    }
  }

  if (n.includes('negocio') || n.includes('empresa') || n.includes('local') || n.includes('tienda') || type === 'business') {
    return {
      label: 'Negocio / Comercial',
      Icon: FaShop,
      colorClass: 'text-sky-400 bg-sky-500/15 border-sky-500/30'
    }
  }

  if (n.includes('hogar') || n.includes('casa') || n.includes('familia') || n.includes('apto') || type === 'home') {
    return {
      label: 'Hogar / Familia',
      Icon: FaHouse,
      colorClass: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30'
    }
  }

  if (type === 'personal') {
    return {
      label: 'Personal',
      Icon: FaWallet,
      colorClass: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
    }
  }

  return {
    label: 'Cuenta / Bolsillo',
    Icon: FaWallet,
    colorClass: 'text-slate-300 bg-slate-800/60 border-slate-700/50'
  }
}
