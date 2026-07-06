import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

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

  // Enviar correo (opcional: solo si hay proveedor configurado)
  let emailed = false
  const RESEND_API_KEY = process.env.RESEND_API_KEY
  const FROM = process.env.EMAIL_FROM || 'Finanzas Personales <onboarding@resend.dev>'
  if (RESEND_API_KEY) {
    try {
      const inviter = user.user_metadata?.full_name || user.email
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM,
          to: [email],
          subject: `Te invitaron a "${ws.name}" en Finanzas Personales`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:24px;color:#0f172a">
              <h2 style="margin:0 0 8px">Te invitaron a un espacio de trabajo</h2>
              <p style="color:#475569;font-size:14px;line-height:1.6">
                <strong>${inviter}</strong> te añadió al espacio
                <strong>"${ws.name}"</strong> en Finanzas Personales.
                Podrás ver y editar sus transacciones, presupuestos y metas.
              </p>
              <p style="color:#475569;font-size:14px;line-height:1.6">
                Inicia sesión con Google usando <strong>este mismo correo</strong> (${email})
                para acceder.
              </p>
              <a href="${origin}/login"
                 style="display:inline-block;margin-top:12px;padding:10px 18px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px">
                Entrar a Finanzas Personales
              </a>
            </div>
          `,
        }),
      })
      emailed = res.ok
    } catch {
      emailed = false
    }
  }

  return NextResponse.json({ ok: true, emailed, member: inserted })
}
