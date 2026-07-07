import { FiUser, FiHome, FiBriefcase, FiFolder } from 'react-icons/fi'
import type { IconType } from 'react-icons'
import type { WorkspaceType } from '@/lib/db'

export const WS_TYPES: { value: WorkspaceType; label: string; Icon: IconType; hint: string }[] = [
  { value: 'personal', label: 'Personal', Icon: FiUser, hint: 'Privado, no se puede compartir' },
  { value: 'home', label: 'Hogar', Icon: FiHome, hint: 'Gastos del hogar en familia' },
  { value: 'business', label: 'Negocio', Icon: FiBriefcase, hint: 'Ventas, nómina, proveedores' },
  { value: 'other', label: 'Otro', Icon: FiFolder, hint: 'Categorías mínimas' },
]

export const wsTypeMeta = (t?: string) => WS_TYPES.find((x) => x.value === t) || WS_TYPES[3]
