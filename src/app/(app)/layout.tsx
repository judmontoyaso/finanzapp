'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LocalDB, User, WorkspaceType } from '@/lib/db'
import { Workspace, WorkspaceMember } from '@/types'
import { toast } from 'react-hot-toast'
import LogoMark from '@/components/LogoMark'
import ThemeToggle from '@/components/ThemeToggle'
import {
  FiMenu,
  FiLogOut,
  FiBriefcase,
  FiPlus,
  FiX,
  FiUsers,
  FiTrash2,
  FiSettings,
  FiEdit2
} from 'react-icons/fi'
import { WS_TYPES, wsTypeMeta } from '@/lib/workspaceMeta'
import MobileTabBar from '@/components/MobileTabBar'

const NAV_ITEMS = [
  { label: 'Panel Principal', href: '/dashboard', icon: '/icons/wallet.png' },
  { label: 'Transacciones', href: '/transactions', icon: '/icons/money-flow.png' },
  { label: 'Reportes', href: '/reports', icon: '/icons/report.png' },
  { label: 'Recurrentes', href: '/recurring', icon: '/icons/forecast.png' },
  { label: 'Presupuestos', href: '/budgets', icon: '/icons/planning.png' },
  { label: 'Metas de Ahorro', href: '/savings', icon: '/icons/gold-ingots.png' },
  { label: 'Categorías', href: '/categories', icon: '/icons/market.png' },
  { label: 'Importar Datos', href: '/import', icon: '/icons/invoice.png' },
]

const MOBILE_DRAWER_ITEMS = [
  { label: 'Recurrentes', href: '/recurring', icon: '/icons/forecast.png' },
  { label: 'Metas de Ahorro', href: '/savings', icon: '/icons/gold-ingots.png' },
  { label: 'Categorías', href: '/categories', icon: '/icons/market.png' },
  { label: 'Importar Datos', href: '/import', icon: '/icons/invoice.png' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const [user, setUser] = useState<User | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(false)

  // Workspace creation modal
  const [isWsModalOpen, setIsWsModalOpen] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const [newWsType, setNewWsType] = useState<WorkspaceType>('home')

  // Workspace edit modal
  const [isEditWsModalOpen, setIsEditWsModalOpen] = useState(false)
  const [editWsName, setEditWsName] = useState('')
  const [editWsType, setEditWsType] = useState<WorkspaceType>('home')
  const [savingEditWs, setSavingEditWs] = useState(false)
  const [isDeleteWsModalOpen, setIsDeleteWsModalOpen] = useState(false)
  const [deletingWsLoading, setDeletingWsLoading] = useState(false)

  // Share (members) modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [membersLoading, setMembersLoading] = useState(false)

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)
  const isOwner = !!user && !!activeWorkspace && activeWorkspace.user_id === user.id
  const canShare = isOwner

  const loadData = useCallback(async () => {
    try {
      const currentUser = await LocalDB.getCurrentUser()
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)

      const wsList = await LocalDB.getWorkspaces()
      setWorkspaces(wsList)

      // Aviso in-app: espacios compartidos conmigo que aún no había visto
      const shared = wsList.filter((w) => w.user_id !== currentUser.id)
      if (typeof window !== 'undefined' && shared.length > 0) {
        let seen: string[] = []
        try {
          seen = JSON.parse(localStorage.getItem('finanzas_seen_shared') || '[]')
        } catch {}
        const nuevos = shared.filter((w) => !seen.includes(w.id))
        nuevos.forEach((w) => {
          toast.success(`Te añadieron al espacio "${w.name}"`, {
            duration: 6000,
            icon: <FiUsers className="w-4 h-4 text-emerald-400" />,
          })
        })
        if (nuevos.length > 0) {
          localStorage.setItem('finanzas_seen_shared', JSON.stringify(shared.map((w) => w.id)))
        }
      }

      const storedWs = LocalDB.getActiveWorkspaceId()
      if (storedWs && wsList.some((w) => w.id === storedWs)) {
        setActiveWorkspaceId(storedWs)
      } else if (wsList.length > 0) {
        LocalDB.setActiveWorkspaceId(wsList[0].id)
        setActiveWorkspaceId(wsList[0].id)
      }
    } catch (err) {
      console.error('Error inicializando layout:', err)
      setDbError(true)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    // Restore sidebar collapsed state from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebar_collapsed')
      if (stored === 'true') setCollapsed(true)
    }
    loadData()
  }, [loadData])

  useEffect(() => {
    const handler = () => loadData()
    window.addEventListener('finanzas_data_changed', handler)
    return () => window.removeEventListener('finanzas_data_changed', handler)
  }, [loadData])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebar_collapsed', String(next))
      }
      return next
    })
  }

  const handleWorkspaceChange = (wsId: string) => {
    if (wsId === '__new__') {
      setIsWsModalOpen(true)
      return
    }
    if (wsId === activeWorkspaceId) return
    LocalDB.setActiveWorkspaceId(wsId)
    setActiveWorkspaceId(wsId)
    const ws = workspaces.find((w) => w.id === wsId)
    if (ws) {
      const Icon = wsTypeMeta(ws.type).Icon
      toast.success(`Ahora en: ${ws.name}`, { icon: <Icon className="w-4 h-4 text-emerald-400" /> })
    }
  }

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newWsName.trim()
    if (!name) return
    // Evitar nombres duplicados entre los espacios que posee el usuario
    const dup = workspaces.some(
      (w) => w.user_id === user?.id && w.name.trim().toLowerCase() === name.toLowerCase()
    )
    if (dup) {
      toast.error('Ya tienes un espacio con ese nombre')
      return
    }
    try {
      const ws = await LocalDB.addWorkspace(name, newWsType)
      LocalDB.setActiveWorkspaceId(ws.id)
      setActiveWorkspaceId(ws.id)
      setNewWsName('')
      setNewWsType('home')
      setIsWsModalOpen(false)
      toast.success('Espacio creado con éxito')
    } catch (err) {
      const raw = err instanceof Error ? err.message : ''
      toast.error(raw.includes('duplicate') || raw.includes('workspaces_user_name_uniq')
        ? 'Ya tienes un espacio con ese nombre'
        : 'Error al crear espacio')
    }
  }

  const openEditActiveWorkspace = () => {
    if (!activeWorkspace) return
    setEditWsName(activeWorkspace.name)
    setEditWsType(activeWorkspace.type || 'other')
    setIsEditWsModalOpen(true)
  }

  const handleSaveEditWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspace || !editWsName.trim()) return
    setSavingEditWs(true)
    try {
      await LocalDB.updateWorkspace(activeWorkspace.id, editWsName.trim(), editWsType)
      toast.success('Espacio actualizado con éxito')
      setIsEditWsModalOpen(false)
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar el espacio')
    } finally {
      setSavingEditWs(false)
    }
  }

  const handleDeleteActiveWorkspace = async () => {
    if (!activeWorkspace) return
    setDeletingWsLoading(true)
    try {
      await LocalDB.deleteWorkspace(activeWorkspace.id)
      toast.success(`Espacio "${activeWorkspace.name}" eliminado`)
      setIsDeleteWsModalOpen(false)
      setIsEditWsModalOpen(false)
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar el espacio')
    } finally {
      setDeletingWsLoading(false)
    }
  }

  const openShareModal = async () => {
    if (!activeWorkspaceId) return
    setIsShareModalOpen(true)
    setMembersLoading(true)
    try {
      const list = await LocalDB.getWorkspaceMembers(activeWorkspaceId)
      setMembers(list)
    } catch {
      toast.error('No se pudieron cargar los miembros')
    } finally {
      setMembersLoading(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = newMemberEmail.trim().toLowerCase()
    if (!email || !activeWorkspaceId) return
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: activeWorkspaceId, email }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'No se pudo vincular')
        return
      }
      if (data.member) setMembers((prev) => [...prev, data.member])
      setNewMemberEmail('')
      toast.success(data.emailed ? 'Invitación enviada por correo' : 'Persona vinculada al espacio')
    } catch {
      toast.error('Error de red al vincular')
    }
  }

  const handleRemoveMember = async (id: string) => {
    try {
      await LocalDB.removeWorkspaceMember(id)
      setMembers((prev) => prev.filter((m) => m.id !== id))
      toast.success('Acceso revocado')
    } catch {
      toast.error('Error al revocar acceso')
    }
  }

  const handleSignOut = async () => {
    await LocalDB.signOut()
    router.push('/login')
  }

  const closeMobile = () => setMobileOpen(false)

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <svg className="animate-spin h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )
  }

  // DB error / config guide screen (prevents redirect loops)
  if (dbError) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 px-6">
        <div className="bg-slate-900 border border-slate-800 rounded-md p-8 max-w-md w-full text-center space-y-4">
          <LogoMark className="w-10 h-10 mx-auto" />
          <h2 className="text-lg font-bold text-slate-100">Error de Conexion</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            No se pudo conectar con la base de datos. Verifica tu configuracion de Supabase y que las variables de entorno esten correctas.
          </p>
          <button
            onClick={() => { setDbError(false); setLoading(true); loadData() }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // Sidebar content (shared between desktop and mobile)
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo + Toggle */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <LogoMark className="w-6 h-6 flex-shrink-0" />
          {!collapsed && (
            <span className="text-sm font-bold text-slate-100 whitespace-nowrap">Arca Finanzas</span>
          )}
        </div>
        <button
          onClick={toggleCollapsed}
          className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-100 rounded-md hover:bg-slate-800 transition-all cursor-pointer"
        >
          <FiMenu className="w-4 h-4" />
        </button>
      </div>

      {/* Workspace Selector */}
      <div className="px-3 py-3 border-b border-slate-800">
        {collapsed ? (
          <div className="flex flex-col items-center gap-3">
            <FiBriefcase className="w-4 h-4 text-slate-400" />
            {canShare && (
              <button
                onClick={openShareModal}
                title="Compartir espacio"
                className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-md hover:bg-slate-800 transition-all cursor-pointer"
              >
                <FiUsers className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <>
            <select
              value={activeWorkspaceId}
              onChange={(e) => handleWorkspaceChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-md py-1.5 px-2 text-[10px] font-semibold focus:border-emerald-500 outline-none transition-all cursor-pointer"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
              <option value="__new__">+ Nueva cuenta / espacio...</option>
            </select>
            {canShare && (
              <button
                onClick={openShareModal}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-semibold text-slate-400 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/40 rounded-md transition-all cursor-pointer"
              >
                <FiUsers className="w-3 h-3" /> Compartir
              </button>
            )}
          </>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobile}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 group ${
                isActive
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
              }`}
            >
              <img src={item.icon} alt="" className={`w-5 h-5 flex-shrink-0 object-contain transition-opacity ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} />
              {!collapsed && (
                <span className="text-xs font-semibold whitespace-nowrap">{item.label}</span>
              )}
            </Link>
          )
        })}
      </nav>



      {/* User Profile */}
      <div className="mt-auto border-t border-slate-800">
        <div className={`px-3 py-3 flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <img
            src={user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'}
            alt="Avatar"
            className="w-8 h-8 rounded-md object-cover flex-shrink-0"
          />
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-100 truncate">{user?.name || 'Usuario'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email || ''}</p>
            </div>
          )}
        </div>

        {/* Configuración */}
        <Link
          href="/settings"
          title={collapsed ? 'Configuración' : undefined}
          className={`w-full flex items-center gap-3 px-4 py-3 transition-all cursor-pointer border-t border-slate-800 ${collapsed ? 'justify-center' : ''} ${pathname === '/settings' ? 'text-emerald-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'}`}
        >
          <FiSettings className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-[10px] font-semibold">Configuración</span>}
        </Link>

        {/* Theme Toggle */}
        <ThemeToggle collapsed={collapsed} />

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className={`w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 transition-all cursor-pointer border-t border-slate-800 ${collapsed ? 'justify-center' : ''}`}
        >
          <FiLogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-[10px] font-semibold">Cerrar Sesion</span>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ${
          collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'
        }`}
        style={{ width: collapsed ? 64 : 240 }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Header (menú a la izquierda, del mismo lado que abre el sidebar) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900 border-b border-slate-800 h-14 flex items-center gap-3 px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 text-slate-400 hover:text-slate-100 rounded-md hover:bg-slate-800 transition-all cursor-pointer"
        >
          <FiMenu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <LogoMark className="w-6 h-6" />
          <span className="text-sm font-bold text-slate-100">Arca Finanzas</span>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={closeMobile}
          ></div>
          {/* Sidebar panel */}
          <aside className="absolute left-0 top-0 bottom-0 w-[240px] bg-slate-900 border-r border-slate-800 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-end px-4 py-3 border-b border-slate-800">
              <button
                onClick={closeMobile}
                className="p-1.5 text-slate-400 hover:text-slate-100 rounded-md hover:bg-slate-800 transition-all cursor-pointer"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            {/* Re-render sidebar content but never collapsed on mobile */}
            <div className="flex flex-col h-[calc(100%-52px)]">
              {/* Logo */}
              <div className="flex items-center gap-2.5 px-4 py-4 border-b border-slate-800">
                <LogoMark className="w-6 h-6 flex-shrink-0" />
                <span className="text-sm font-bold text-slate-100 whitespace-nowrap">Arca Finanzas</span>
              </div>

              {/* Workspace Selector */}
              <div className="px-3 py-3 border-b border-slate-800">
                <select
                  value={activeWorkspaceId}
                  onChange={(e) => handleWorkspaceChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-md py-1.5 px-2 text-[10px] font-semibold focus:border-emerald-500 outline-none transition-all cursor-pointer"
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                  <option value="__new__">+ Crear espacio de trabajo</option>
                </select>
                {canShare && (
                  <button
                    onClick={() => { closeMobile(); openShareModal() }}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-semibold text-slate-400 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/40 rounded-md transition-all cursor-pointer"
                  >
                    <FiUsers className="w-3 h-3" /> Compartir
                  </button>
                )}
              </div>

              {/* Navigation */}
              <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
                {MOBILE_DRAWER_ITEMS.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobile}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150 group ${
                        isActive
                          ? 'bg-slate-800 text-slate-100'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                      }`}
                    >
                      <img src={item.icon} alt="" className={`w-5 h-5 flex-shrink-0 object-contain transition-opacity ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} />
                      <span className="text-xs font-semibold whitespace-nowrap">{item.label}</span>
                    </Link>
                  )
                })}
              </nav>



              {/* User profile */}
              <div className="mt-auto border-t border-slate-800">
                <div className="px-3 py-3 flex items-center gap-3">
                  <img
                    src={user?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'}
                    alt="Avatar"
                    className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                  />
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-100 truncate">{user?.name || 'Usuario'}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user?.email || ''}</p>
                  </div>
                </div>
                <Link
                  href="/settings"
                  onClick={closeMobile}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-all cursor-pointer border-t border-slate-800 ${pathname === '/settings' ? 'text-emerald-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'}`}
                >
                  <FiSettings className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[10px] font-semibold">Configuración</span>
                </Link>
                <ThemeToggle />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 transition-all cursor-pointer border-t border-slate-800"
                >
                  <FiLogOut className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[10px] font-semibold">Cerrar Sesion</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-950 pt-14 pb-20 md:pt-0 md:pb-0">
        {/* Active workspace bar (avoids confusion when switching) */}
        {activeWorkspace && (
          <div className="md:sticky md:top-0 z-20 bg-slate-900 md:bg-slate-900/90 md:backdrop-blur border-b border-slate-800 px-6 md:px-8 py-3 flex items-center gap-3">
            {(() => {
              const Icon = wsTypeMeta(activeWorkspace.type).Icon
              return <Icon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            })()}
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-100 truncate leading-tight">{activeWorkspace.name}</p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                {wsTypeMeta(activeWorkspace.type).label}
                {activeWorkspace.type !== 'personal' && !isOwner && ' · Compartido contigo'}
              </p>
            </div>
            {isOwner && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={openEditActiveWorkspace}
                  title="Editar este espacio"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold text-slate-400 hover:text-amber-400 border border-slate-800 hover:border-amber-500/40 rounded-md transition-all cursor-pointer"
                >
                  <FiEdit2 className="w-3 h-3" /> Editar
                </button>
                <button
                  onClick={openShareModal}
                  title="Compartir espacio"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold text-slate-400 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/40 rounded-md transition-all cursor-pointer"
                >
                  <FiUsers className="w-3 h-3" /> Compartir
                </button>
              </div>
            )}
          </div>
        )}
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>

      {/* Modal: Create Workspace */}
      {isWsModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-md p-6 shadow-md relative">
            <button
              onClick={() => { setIsWsModalOpen(false); setNewWsName('') }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <h2 className="text-md font-bold text-slate-100 mb-1">Nueva Cuenta / Bolsillo (Espacio)</h2>
            <p className="text-xs text-slate-400 mb-6">
              Cada cuenta o bolsillo (ej. Bancolombia, Nequi, Efectivo, Negocio, Ahorros) es un espacio independiente para organizar tus ingresos, gastos y presupuestos.
            </p>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nombre de la Cuenta / Espacio</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Bancolombia, Nequi, Efectivo, Ahorros, Negocio..."
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tipo de Cuenta / Espacio</label>
                <div className="grid grid-cols-2 gap-2">
                  {WS_TYPES.map((t) => {
                    const selected = newWsType === t.value
                    const Icon = t.Icon
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setNewWsType(t.value)}
                        className={`flex items-start gap-2 p-2.5 rounded-md border text-left transition-all cursor-pointer ${
                          selected
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                        }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${selected ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span className="min-w-0">
                          <span className={`block text-xs font-bold ${selected ? 'text-emerald-400' : 'text-slate-200'}`}>{t.label}</span>
                          <span className="block text-[10px] text-slate-500 leading-tight">{t.hint}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-[10px] text-slate-500">
                  Se crearán categorías sugeridas según el tipo.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsWsModalOpen(false); setNewWsName('') }}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-md text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-all"
                >
                  <span className="flex items-center gap-1.5"><FiPlus className="w-3.5 h-3.5" /> Crear Cuenta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Share Workspace (members) */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-md p-6 shadow-md relative">
            <button
              onClick={() => { setIsShareModalOpen(false); setNewMemberEmail('') }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <h2 className="text-md font-bold text-slate-100 mb-1 flex items-center gap-2">
              <FiUsers className="w-4 h-4 text-emerald-500" /> Compartir Cuenta / Espacio
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Vincula a otra persona por su email (pareja, socio o familiar). Ambos usuarios podrán ver el balance, consultar movimientos y registrar nuevos ingresos y gastos en tiempo real en
              <span className="text-slate-200 font-bold"> {activeWorkspace?.name}</span>.
            </p>

            <form onSubmit={handleAddMember} className="flex gap-2 mb-5">
              <input
                type="email"
                required
                placeholder="persona@email.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <FiPlus className="w-3.5 h-3.5" /> Vincular
              </button>
            </form>

            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {membersLoading ? (
                <p className="text-xs text-slate-500 text-center py-4">Cargando...</p>
              ) : members.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">Aún no has vinculado a nadie.</p>
              ) : (
                members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-md px-3 py-2">
                    <span className="text-xs text-slate-200 truncate">{m.invited_email}</span>
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      title="Revocar acceso"
                      className="p-1 text-slate-500 hover:text-rose-400 transition-all cursor-pointer flex-shrink-0"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Workspace */}
      {isEditWsModalOpen && activeWorkspace && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-md p-6 shadow-md relative animate-fadeIn">
            <button
              onClick={() => setIsEditWsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <h2 className="text-md font-bold text-slate-100 mb-1 flex items-center gap-2">
              <FiEdit2 className="w-4 h-4 text-amber-400" />
              Editar Espacio
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Modifica el nombre o el tipo de este espacio.
            </p>

            <form onSubmit={handleSaveEditWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nombre del Espacio</label>
                <input
                  type="text"
                  required
                  value={editWsName}
                  onChange={(e) => setEditWsName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-md py-2 px-3 text-xs focus:border-emerald-500 outline-none transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tipo de Cuenta / Espacio</label>
                <div className="grid grid-cols-2 gap-2">
                  {WS_TYPES.map((t) => {
                    const selected = editWsType === t.value
                    const Icon = t.Icon
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setEditWsType(t.value)}
                        className={`flex items-start gap-2 p-2.5 rounded-md border text-left transition-all cursor-pointer ${
                          selected
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                        }`}
                      >
                        <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${selected ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span className="min-w-0">
                          <span className={`block text-xs font-bold ${selected ? 'text-emerald-400' : 'text-slate-200'}`}>{t.label}</span>
                          <span className="block text-[10px] text-slate-500 leading-tight">{t.hint}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                {workspaces.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setIsDeleteWsModalOpen(true)}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" /> Eliminar Espacio
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsEditWsModalOpen(false)}
                    className="px-3.5 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-md text-xs font-semibold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingEditWs || !editWsName.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {savingEditWs ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Workspace Confirmation */}
      {isDeleteWsModalOpen && activeWorkspace && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 w-full max-w-md rounded-md p-6 shadow-md relative animate-fadeIn">
            <button
              onClick={() => setIsDeleteWsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              <FiX className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-9 h-9 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
                <FiTrash2 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-md font-bold text-slate-100 leading-tight">
                  Eliminar Espacio
                </h2>
                <p className="text-xs text-rose-400 font-semibold">{activeWorkspace.name}</p>
              </div>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 rounded p-3 my-4">
              <p className="text-xs text-slate-200 leading-relaxed">
                ¿Estás seguro de que deseas eliminar permanentemente el espacio <strong className="text-white font-bold">{activeWorkspace.name}</strong>?
              </p>
              <p className="text-[11px] text-rose-300/90 mt-1.5 leading-normal">
                ⚠️ Se eliminarán todas las transacciones, categorías, presupuestos y miembros asociados a este espacio. Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteWsModalOpen(false)}
                className="px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-md text-xs font-semibold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteActiveWorkspace}
                disabled={deletingWsLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
                {deletingWsLoading ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Tab Bar */}
      <MobileTabBar />

    </div>
  )
}
