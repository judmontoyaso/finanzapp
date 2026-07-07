import { NextResponse } from 'next/server'
import { getAdmin, isAuthorizedCron, resolveRecipients, appUrl } from '@/lib/cron'
import { budgetAlertEmail, sendEmail } from '@/lib/email'

// GET /api/cron/budget-alerts
// Revisa el gasto del mes en curso contra los presupuestos de cada espacio.
// Envía un correo a dueño + invitados si alguna categoría está al >=80%.
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
  const monthKey = new Date().toISOString().substring(0, 7) // YYYY-MM

  const [{ data: workspaces }, { data: budgets }, { data: categories }, { data: txs }, { data: members }] =
    await Promise.all([
      admin.from('workspaces').select('id, name, user_id'),
      admin.from('budgets').select('workspace_id, category_id, amount'),
      admin.from('categories').select('id, name'),
      admin.from('transactions').select('workspace_id, category_id, amount, type').gte('date', `${monthKey}-01`),
      admin.from('workspace_members').select('workspace_id, invited_email'),
    ])

  const catName = new Map((categories || []).map((c) => [c.id, c.name]))
  const ownerCache = new Map<string, string | null>()
  let sent = 0

  for (const ws of workspaces || []) {
    const wsBudgets = (budgets || []).filter((b) => b.workspace_id === ws.id && b.amount > 0)
    if (wsBudgets.length === 0) continue

    const wsExpenses = (txs || []).filter((t) => t.workspace_id === ws.id && t.type === 'expense')

    const items = wsBudgets
      .map((b) => {
        const spent = wsExpenses
          .filter((t) => t.category_id === b.category_id)
          .reduce((s, t) => s + Number(t.amount), 0)
        const pct = (spent / Number(b.amount)) * 100
        return { category: catName.get(b.category_id) || 'Sin categoría', spent, limit: Number(b.amount), pct }
      })
      .filter((i) => i.pct >= 80)
      .sort((a, b) => b.pct - a.pct)

    if (items.length === 0) continue

    const memberEmails = (members || [])
      .filter((m) => m.workspace_id === ws.id)
      .map((m) => m.invited_email)
    const recipients = await resolveRecipients(admin, ws.user_id, memberEmails, ownerCache)

    const content = budgetAlertEmail({ workspaceName: ws.name, items, appUrl: url })
    for (const to of recipients) {
      if (await sendEmail(to, content)) sent++
    }
  }

  return NextResponse.json({ ok: true, sent })
}
