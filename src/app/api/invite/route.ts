import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { invitationEmail, sendEmail } from '@/lib/email'

// POST /api/invite  { workspaceId, email }
// Inserta al miembro (respetando RLS con la sesión del usuario) y, si hay
// RESEND_API_KEY configurada, envía un correo de invitación.
export async function POST(request: Request) {
  const origin = new URL(request.url).origin

  let body: { workspaceId?: string; email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }

  const workspaceId = body.workspaceId
  const email = (body.email || '').trim().toLowerCase()
  if (!workspaceId || !email) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Verificar que soy el dueño y que el espacio no es personal
  const { data: ws, error: wsError } = await supabase
    .from('workspaces')
    .select('id, name, user_id, type')
    .eq('id', workspaceId)
    .single()

  if (wsError || !ws) {
    return NextResponse.json({ error: 'Espacio no encontrado' }, { status: 404 })
  }
  if (ws.user_id !== user.id || ws.type === 'personal') {
    return NextResponse.json({ error: 'No autorizado para invitar aquí' }, { status: 403 })
  }

  // Insertar miembro (RLS vuelve a validar en el servidor)
  const { data: inserted, error: insErr } = await supabase
    .from('workspace_members')
    .insert({ workspace_id: workspaceId, invited_email: email })
    .select()
    .single()

  if (insErr) {
    const dup = insErr.message?.includes('duplicate')
    return NextResponse.json(
      { error: dup ? 'Esa persona ya está vinculada' : 'No se pudo vincular' },
      { status: dup ? 409 : 400 }
    )
  }

  // Enviar correo de invitación (no-op si no hay proveedor configurado)
  const inviter = user.user_metadata?.full_name || user.email || 'Alguien'
  const emailed = await sendEmail(
    email,
    invitationEmail({ inviter, workspaceName: ws.name, invitedEmail: email, loginUrl: `${origin}/login` })
  )

  return NextResponse.json({ ok: true, emailed, member: inserted })
}
