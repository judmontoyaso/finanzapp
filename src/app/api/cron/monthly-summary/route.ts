import { NextResponse } from 'next/server'
import { getAdmin, isAuthorizedCron, resolveRecipients, appUrl } from '@/lib/cron'
import { monthlySummaryEmail, sendEmail } from '@/lib/email'

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// GET /api/cron/monthly-summary
// El día 1 arma el resumen del mes ANTERIOR por espacio y lo envía a
// dueño + invitados (solo si hubo movimientos).
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let admin
  try {
    admin = getAdmin()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  const url = appUrl(request)
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const y = prev.getFullYear()
  const m = prev.getMonth()
  const monthKey = `${y}-${String(m + 1).padStart(2, '0')}` // YYYY-MM
  const monthLabel = `${MONTHS[m]} ${y}`
  const start = `${monthKey}-01`
  const endDate = new Date(y, m + 1, 1).toISOString().split('T')[0] // primer día del mes actual

  const [{ data: workspaces }, { data: categories }, { data: txs }, { data: members }] = await Promise.all([
    admin.from('workspaces').select('id, name, user_id'),
    admin.from('categories').select('id, name'),
    admin.from('transactions').select('workspace_id, category_id, amount, type').gte('date', start).lt('date', endDate),
    admin.from('workspace_members').select('workspace_id, invited_email'),
  ])

  const catName = new Map((categories || []).map((c) => [c.id, c.name]))
  const ownerCache = new Map<string, string | null>()
  let sent = 0

  for (const ws of workspaces || []) {
    const wsTxs = (txs || []).filter((t) => t.workspace_id === ws.id)
    if (wsTxs.length === 0) continue

    const income = wsTxs.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = wsTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    if (income === 0 && expense === 0) continue

    // Categoría de mayor gasto
    const byCat = new Map<string, number>()
    wsTxs.filter((t) => t.type === 'expense').forEach((t) => {
      byCat.set(t.category_id, (byCat.get(t.category_id) || 0) + Number(t.amount))
    })
    let topCategory: { name: string; amount: number } | null = null
    for (const [cid, amt] of byCat) {
      if (!topCategory || amt > topCategory.amount) {
        topCategory = { name: catName.get(cid) || 'Sin categoría', amount: amt }
      }
    }

    const memberEmails = (members || [])
      .filter((mm) => mm.workspace_id === ws.id)
      .map((mm) => mm.invited_email)
    const recipients = await resolveRecipients(admin, ws.user_id, memberEmails, ownerCache)

    const content = monthlySummaryEmail({
      workspaceName: ws.name,
      monthLabel,
      income,
      expense,
      net: income - expense,
      topCategory,
      appUrl: url,
    })
    for (const to of recipients) {
      if (await sendEmail(to, content)) sent++
    }
  }

  return NextResponse.json({ ok: true, sent })
}
