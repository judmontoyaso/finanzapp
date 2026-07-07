import { NextResponse } from 'next/server'
import { getAdmin, isAuthorizedCron, appUrl } from '@/lib/cron'
import { featuresAnnouncementEmail, sendEmail } from '@/lib/email'

// POST /api/admin/broadcast-welcome
// Envía el correo de funcionalidades a TODOS los usuarios registrados.
// Protegido por CRON_SECRET. Uso puntual (no programado).
// ?dry=1 -> solo lista, no envía.
export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let admin
  try {
    admin = getAdmin()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  const dry = new URL(request.url).searchParams.get('dry') === '1'
  const url = appUrl(request)

  // Reunir todos los usuarios (paginado)
  const users: { email: string; name: string }[] = []
  let page = 1
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    for (const u of data.users) {
      if (u.email) {
        const name = (u.user_metadata?.full_name as string | undefined)?.split(' ')[0] || u.email.split('@')[0]
        users.push({ email: u.email, name })
      }
    }
    if (data.users.length < 200) break
    page++
  }

  if (dry) {
    return NextResponse.json({ ok: true, total: users.length, emails: users.map((u) => u.email) })
  }

  let sent = 0
  for (const u of users) {
    if (await sendEmail(u.email, featuresAnnouncementEmail(u.name, url))) sent++
  }

  return NextResponse.json({ ok: true, total: users.length, sent })
}
