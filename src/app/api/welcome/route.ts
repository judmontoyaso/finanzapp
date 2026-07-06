import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { welcomeEmail, sendEmail } from '@/lib/email'

// POST /api/welcome — envía el correo de bienvenida al usuario autenticado.
// Se dispara una sola vez, al crear su espacio personal (primer login).
export async function POST(request: Request) {
  const origin = new URL(request.url).origin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const name = user.user_metadata?.full_name?.split(' ')[0] || user.email.split('@')[0]
  const emailed = await sendEmail(user.email, welcomeEmail(name, origin))
  return NextResponse.json({ ok: true, emailed })
}
