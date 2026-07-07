import { NextResponse } from 'next/server'
import { isAuthorizedCron } from '@/lib/cron'

// GET /api/cron/daily — único cron programado (Vercel Hobby limita el número).
// Reparte a las tareas según el día: reportes siempre, alertas de presupuesto
// los lunes, resumen mensual el día 1.
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const origin = new URL(request.url).origin
  const secret = process.env.CRON_SECRET || ''
  const headers = { Authorization: `Bearer ${secret}` }
  const now = new Date()
  const out: Record<string, unknown> = {}

  const hit = async (path: string) => {
    try {
      const r = await fetch(`${origin}${path}`, { headers })
      return await r.json()
    } catch (e) {
      return { error: (e as Error).message }
    }
  }

  out.reports = await hit('/api/cron/reports')
  if (now.getUTCDay() === 1) out.budgetAlerts = await hit('/api/cron/budget-alerts')
  if (now.getUTCDate() === 1) out.monthlySummary = await hit('/api/cron/monthly-summary')

  return NextResponse.json({ ok: true, ...out })
}
