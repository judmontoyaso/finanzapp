import { NextResponse } from 'next/server'
import { getAdmin, isAuthorizedCron, resolveRecipients, appUrl } from '@/lib/cron'
import { reportEmail, sendEmail } from '@/lib/email'
import { generateReport } from '@/lib/ai'

const money = (n: number) => '$' + n.toLocaleString('es-ES', { minimumFractionDigits: 2 })
const addDays = (dateStr: string, n: number) => {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}
const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })

// GET /api/cron/reports — diario. Envía el reporte IA a los espacios cuya
// configuración esté habilitada y con next_run <= hoy, y avanza la fecha.
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  let admin
  try {
    admin = getAdmin()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  const url = appUrl(request)
  const today = new Date().toISOString().split('T')[0]

  const { data: due, error: dueErr } = await admin
    .from('report_settings')
    .select('*')
    .eq('enabled', true)
    .lte('next_run', today)
  if (dueErr) return NextResponse.json({ error: 'DB: ' + dueErr.message }, { status: 500 })
  if (!due || due.length === 0) return NextResponse.json({ ok: true, sent: 0 })

  const ownerCache = new Map<string, string | null>()
  let sent = 0

  for (const s of due) {
    const period = s.period_days || 15
    const start = addDays(today, -period)
    const prevStart = addDays(today, -2 * period)

    const { data: ws } = await admin.from('workspaces').select('id, name, user_id').eq('id', s.workspace_id).maybeSingle()
    if (!ws) continue

    const [{ data: txs }, { data: cats }, { data: members }, { data: budgets }] = await Promise.all([
      admin.from('transactions').select('type, amount, category_id, date').eq('workspace_id', ws.id).gte('date', prevStart),
      admin.from('categories').select('id, name').eq('workspace_id', ws.id),
      admin.from('workspace_members').select('invited_email').eq('workspace_id', ws.id),
      admin.from('budgets').select('category_id, amount').eq('workspace_id', ws.id),
    ])

    const catName = new Map((cats || []).map((c) => [c.id, c.name]))
    const inRange = (d: string, a: string, b: string) => d >= a && d < b
    const endExcl = addDays(today, 1)
    const cur = (txs || []).filter((t) => inRange(t.date, start, endExcl))
    const prev = (txs || []).filter((t) => inRange(t.date, prevStart, start))

    const sum = (arr: typeof cur, type: string) => arr.filter((t) => t.type === type).reduce((s2, t) => s2 + Number(t.amount), 0)
    const income = sum(cur, 'income')
    const expense = sum(cur, 'expense')
    const net = income - expense
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0
    const prevExpense = sum(prev, 'expense')
    const prevIncome = sum(prev, 'income')

    const byCat = new Map<string, number>()
    cur.filter((t) => t.type === 'expense').forEach((t) => byCat.set(t.category_id, (byCat.get(t.category_id) || 0) + Number(t.amount)))
    const topCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, amt]) => ({ name: catName.get(id) || 'Sin categoría', amount: amt }))
    const topCategory = topCats[0] || null

    // Presupuestos excedidos/cerca (mes en curso)
    const monthKey = today.substring(0, 7)
    const monthExp = (txs || []).filter((t) => t.type === 'expense' && t.date.startsWith(monthKey))
    const budgetLines = (budgets || [])
      .filter((b) => Number(b.amount) > 0)
      .map((b) => {
        const spent = monthExp.filter((t) => t.category_id === b.category_id).reduce((s2, t) => s2 + Number(t.amount), 0)
        return { name: catName.get(b.category_id) || '', pct: (spent / Number(b.amount)) * 100 }
      })
      .filter((x) => x.pct >= 80)

    // Prompt para la IA
    const dataText = [
      `Periodo: ${fmt(start)} a ${fmt(today)} (${period} días).`,
      `Ingresos: ${money(income)} (periodo anterior ${money(prevIncome)}).`,
      `Gastos: ${money(expense)} (periodo anterior ${money(prevExpense)}).`,
      `Balance: ${money(net)}. Tasa de ahorro: ${savingsRate.toFixed(0)}%.`,
      `Mayores gastos por categoría: ${topCats.map((c) => `${c.name} ${money(c.amount)}`).join(', ') || 'sin gastos'}.`,
      budgetLines.length ? `Presupuestos en riesgo: ${budgetLines.map((b) => `${b.name} ${b.pct.toFixed(0)}%`).join(', ')}.` : 'Presupuestos: sin alertas.',
    ].join('\n')

    const system =
      'Eres un asesor financiero personal. Escribes en español con tono sobrio, claro y profesional. ' +
      'REGLAS: no agregues preámbulos ni frases como "Claro, aquí tienes"; empieza directo. ' +
      'No dramatices ni exageres. Usa SOLO los datos provistos; no inventes causas, deudas, créditos ni motivos que no estén en los datos. ' +
      'Si no hay ingresos o pocos datos, dilo con naturalidad sin alarmismo. ' +
      'Formato Markdown limpio: títulos de sección con "## ", viñetas con "- ", y **negrita** solo para 1-2 términos clave por sección. No uses asteriscos sueltos.'
    const user =
      `Datos del espacio "${ws.name}". Escribe un reporte breve (máx ~180 palabras) con estas secciones:\n` +
      `## Resumen\n## Hallazgos\n## Recomendaciones (2 a 4, concretas y realistas)\n\n` +
      `Incluye "## Alertas" solo si los datos lo justifican.\n\nDATOS:\n${dataText}`

    let narrative = await generateReport(system, user)
    if (!narrative) {
      narrative =
        `**Resumen:** en los últimos ${period} días tuviste ingresos de ${money(income)} y gastos de ${money(expense)}, ` +
        `con un balance de ${money(net)} y una tasa de ahorro de ${savingsRate.toFixed(0)}%.\n\n` +
        (topCategory ? `Tu mayor gasto fue en **${topCategory.name}** (${money(topCategory.amount)}).\n\n` : '') +
        (budgetLines.length ? `**Atención:** ${budgetLines.map((b) => b.name).join(', ')} cerca o sobre su límite.\n\n` : '') +
        `**Sugerencia:** revisa tus categorías de mayor gasto y fija un presupuesto donde aún no lo tengas.`
    }

    const recipients = await resolveRecipients(admin, ws.user_id, (members || []).map((m) => m.invited_email), ownerCache)
    const content = reportEmail({
      workspaceName: ws.name,
      periodLabel: `${fmt(start)} – ${fmt(today)}`,
      income,
      expense,
      net,
      savingsRate,
      topCategory,
      narrative,
      appUrl: url,
    })
    for (const to of recipients) {
      if (await sendEmail(to, content)) sent++
    }

    await admin.from('report_settings').update({ next_run: addDays(today, period) }).eq('workspace_id', ws.id)
  }

  return NextResponse.json({ ok: true, sent })
}
