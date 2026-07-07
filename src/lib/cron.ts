// Server-only. Utilidades para los crons: cliente admin (service role,
// bypasea RLS) y resolución de destinatarios de un espacio.
import { createClient } from '@supabase/supabase-js'

export function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, {
    db: { schema: 'finanzas' },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

type Admin = ReturnType<typeof getAdmin>

// Autoriza la petición del cron (Vercel envía Authorization: Bearer CRON_SECRET)
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // sin secreto configurado, no bloquear (dev)
  return request.headers.get('authorization') === `Bearer ${secret}`
}

// Emails que deben recibir avisos de un espacio: dueño + invitados
export async function resolveRecipients(
  admin: Admin,
  ownerUserId: string,
  memberEmails: string[],
  ownerEmailCache: Map<string, string | null>
): Promise<string[]> {
  const emails = new Set<string>()
  if (!ownerEmailCache.has(ownerUserId)) {
    const { data } = await admin.auth.admin.getUserById(ownerUserId)
    ownerEmailCache.set(ownerUserId, data?.user?.email ?? null)
  }
  const ownerEmail = ownerEmailCache.get(ownerUserId)
  if (ownerEmail) emails.add(ownerEmail.toLowerCase())
  memberEmails.forEach((e) => emails.add(e.toLowerCase()))
  return [...emails]
}

export function appUrl(request: Request): string {
  return process.env.APP_URL || new URL(request.url).origin
}
