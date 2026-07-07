// Server-only. Plantillas de correo + envío vía Resend.
// No importar desde componentes cliente.

const BRAND = 'Arca Finanzas'
const ACCENT = '#059669'
const ACCENT_DARK = '#047857'
const TEXT = '#0f172a'
const MUTED = '#64748b'
const BORDER = '#e2e8f0'
const BG = '#f1f5f9'
const CARD = '#ffffff'
// URL pública para imágenes del correo (los clientes no cargan data URIs)
const APP = process.env.APP_URL || 'https://arcafinanzas.vercel.app'

const money = (n: number) =>
  '$' + n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Envoltura responsiva basada en tablas (compatible con clientes de correo)
function baseLayout(opts: { preheader?: string; heading: string; body: string }): string {
  const { preheader = '', heading, body } = opts
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:0;background:${BG};">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${CARD};border:1px solid ${BORDER};border-radius:14px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="padding:24px 32px;border-bottom:1px solid ${BORDER};">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:40px;vertical-align:middle;"><img src="${APP}/logo.png" width="40" height="40" alt="Arca Finanzas" style="display:block;border:0;" /></td>
                <td style="padding-left:12px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:800;color:${TEXT};">Arca<span style="color:${ACCENT};">Finanzas</span></td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Content -->
        <tr>
          <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;">
            <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${TEXT};font-weight:800;">${heading}</h1>
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid ${BORDER};font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUTED};line-height:1.6;">
            Enviado por ${BRAND}. Este es un correo automático, no respondas a este mensaje.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

function paragraph(html: string): string {
  return `<p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:${MUTED};">${html}</p>`
}

function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
    <tr><td style="border-radius:8px;background:${ACCENT};">
      <a href="${url}" style="display:inline-block;padding:11px 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
    </td></tr>
  </table>`
}

export type EmailContent = { subject: string; html: string }

export function welcomeEmail(name: string, appUrl: string): EmailContent {
  return {
    subject: `Bienvenido a ${BRAND}`,
    html: baseLayout({
      preheader: 'Tu cuenta está lista. Empieza a controlar tus finanzas.',
      heading: `Hola ${name}, bienvenido`,
      body:
        paragraph('Tu cuenta quedó lista. Creamos automáticamente tu espacio <strong>personal</strong> (privado, no compartible) para que empieces a registrar ingresos y gastos.') +
        paragraph('Puedes crear más espacios (Hogar, Negocio...) e invitar personas para gestionarlos en equipo.') +
        button('Ir a mi panel', `${appUrl}/dashboard`),
    }),
  }
}

function featureRow(icon: string, title: string, desc: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;"><tr>
    <td style="width:30px;vertical-align:top;"><img src="${APP}/icons/${icon}" width="26" height="26" alt="" style="display:block;border:0;" /></td>
    <td style="padding-left:12px;font-family:Arial,Helvetica,sans-serif;">
      <div style="font-size:13px;font-weight:700;color:${TEXT};">${title}</div>
      <div style="font-size:12px;line-height:1.6;color:${MUTED};">${desc}</div>
    </td>
  </tr></table>`
}

export function featuresAnnouncementEmail(name: string, appUrl: string): EmailContent {
  return {
    subject: `Conoce todo lo que puedes hacer en ${BRAND}`,
    html: baseLayout({
      preheader: 'Espacios, recurrentes, presupuestos, metas y avisos por correo.',
      heading: `Hola ${name}, esto es lo que puedes hacer`,
      body:
        paragraph('Reunimos en un solo lugar todo para controlar tu dinero. Un repaso rápido:') +
        featureRow('planning.png', 'Espacios de trabajo', 'Separa tus finanzas: personal, hogar o negocio, cada uno con sus categorías.') +
        featureRow('award.png', 'Compartir en equipo', 'Invita personas por correo a un espacio (no al personal) para gestionarlo juntos.') +
        featureRow('money-flow.png', 'Transacciones y categorías', 'Registra ingresos y gastos y organízalos por categoría.') +
        featureRow('forecast.png', 'Recurrentes con confirmación', 'Salario, arriendo o suscripciones: te avisamos y confirmas antes de registrar.') +
        featureRow('invoice.png', 'Presupuestos con alertas', 'Fija límites por categoría y recibe aviso al acercarte o pasarte.') +
        featureRow('gold-ingots.png', 'Metas de ahorro', 'Define objetivos y sigue tu progreso.') +
        featureRow('report.png', 'Panel e informes', 'Gráficos, comparación mes a mes y balance por espacio.') +
        featureRow('trading.png', 'Avisos por correo', 'Alertas de presupuesto y resumen mensual directo a tu bandeja.') +
        featureRow('wallet.png', 'Instalable y modo claro/oscuro', 'Úsala como app en tu celular, con el tema que prefieras.') +
        button('Abrir mi panel', `${appUrl}/dashboard`),
    }),
  }
}

export function invitationEmail(opts: {
  inviter: string
  workspaceName: string
  invitedEmail: string
  loginUrl: string
}): EmailContent {
  return {
    subject: `Te invitaron a "${opts.workspaceName}" en ${BRAND}`,
    html: baseLayout({
      preheader: `${opts.inviter} te añadió a un espacio de trabajo.`,
      heading: 'Te invitaron a un espacio de trabajo',
      body:
        paragraph(`<strong>${opts.inviter}</strong> te añadió al espacio <strong>"${opts.workspaceName}"</strong>. Podrás ver y editar sus transacciones, presupuestos y metas de ahorro.`) +
        paragraph(`Inicia sesión con Google usando <strong>este mismo correo</strong> (${opts.invitedEmail}) para acceder.`) +
        button('Entrar al espacio', opts.loginUrl),
    }),
  }
}

export function budgetAlertEmail(opts: {
  workspaceName: string
  items: { category: string; spent: number; limit: number; pct: number }[]
  appUrl: string
}): EmailContent {
  const rows = opts.items
    .map((i) => {
      const over = i.spent > i.limit
      const color = over ? '#e11d48' : '#d97706'
      const state = over ? 'Excedido' : 'Cerca del límite'
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${BORDER};font-size:13px;color:${TEXT};font-weight:700;">${i.category}</td>
        <td style="padding:10px 0;border-bottom:1px solid ${BORDER};font-size:13px;color:${MUTED};text-align:right;">${money(i.spent)} / ${money(i.limit)}</td>
        <td style="padding:10px 0 10px 12px;border-bottom:1px solid ${BORDER};font-size:11px;color:${color};font-weight:700;text-align:right;white-space:nowrap;">${state} (${i.pct.toFixed(0)}%)</td>
      </tr>`
    })
    .join('')
  return {
    subject: `Alerta de presupuesto en "${opts.workspaceName}"`,
    html: baseLayout({
      preheader: 'Algunas categorías superaron o están cerca de su límite.',
      heading: 'Alerta de presupuesto',
      body:
        paragraph(`En el espacio <strong>"${opts.workspaceName}"</strong> hay categorías que requieren tu atención este mes:`) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 16px;">${rows}</table>` +
        button('Revisar presupuestos', `${opts.appUrl}/budgets`),
    }),
  }
}

export function monthlySummaryEmail(opts: {
  workspaceName: string
  monthLabel: string
  income: number
  expense: number
  net: number
  topCategory: { name: string; amount: number } | null
  appUrl: string
}): EmailContent {
  const stat = (label: string, value: string, color: string) =>
    `<td style="padding:0 6px;" width="33%">
      <div style="background:${BG};border:1px solid ${BORDER};border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:${MUTED};font-weight:700;">${label}</div>
        <div style="font-size:16px;font-weight:800;color:${color};margin-top:4px;">${value}</div>
      </div>
    </td>`
  return {
    subject: `Resumen de ${opts.monthLabel} · "${opts.workspaceName}"`,
    html: baseLayout({
      preheader: `Ingresos, gastos y balance de ${opts.monthLabel}.`,
      heading: `Resumen de ${opts.monthLabel}`,
      body:
        paragraph(`Así se movió tu espacio <strong>"${opts.workspaceName}"</strong>:`) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 16px;"><tr>
          ${stat('Ingresos', money(opts.income), ACCENT)}
          ${stat('Gastos', money(opts.expense), '#e11d48')}
          ${stat('Balance', money(opts.net), opts.net >= 0 ? ACCENT_DARK : '#d97706')}
        </tr></table>` +
        (opts.topCategory
          ? paragraph(`Tu mayor gasto fue en <strong>${opts.topCategory.name}</strong> (${money(opts.topCategory.amount)}).`)
          : '') +
        button('Ver detalle', `${opts.appUrl}/dashboard`),
    }),
  }
}

// Convierte texto plano del modelo (con saltos de línea y viñetas) a HTML simple
export function textToHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return text
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n').filter((l) => l.trim())
      const isList = lines.every((l) => /^\s*[-*•]/.test(l))
      if (isList) {
        const items = lines.map((l) => `<li style="margin:0 0 4px">${esc(l.replace(/^\s*[-*•]\s?/, ''))}</li>`).join('')
        return `<ul style="margin:0 0 12px;padding-left:18px;color:${MUTED};font-size:13px;line-height:1.7">${items}</ul>`
      }
      const html = esc(block).replace(/\n/g, '<br>').replace(/\*\*(.+?)\*\*/g, `<strong style="color:${TEXT}">$1</strong>`)
      return `<p style="margin:0 0 12px;font-size:13px;line-height:1.7;color:${MUTED}">${html}</p>`
    })
    .join('')
}

export function reportEmail(opts: {
  workspaceName: string
  periodLabel: string
  income: number
  expense: number
  net: number
  savingsRate: number
  topCategory: { name: string; amount: number } | null
  narrative: string
  appUrl: string
}): EmailContent {
  const stat = (label: string, value: string, color: string) =>
    `<td style="padding:0 5px" width="25%"><div style="background:${BG};border:1px solid ${BORDER};border-radius:10px;padding:12px 8px;text-align:center"><div style="font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:${MUTED};font-weight:700">${label}</div><div style="font-size:14px;font-weight:800;color:${color};margin-top:4px">${value}</div></div></td>`
  return {
    subject: `Tu reporte financiero · ${opts.workspaceName} (${opts.periodLabel})`,
    html: baseLayout({
      preheader: `Análisis y recomendaciones de ${opts.periodLabel}.`,
      heading: `Reporte financiero`,
      body:
        paragraph(`Periodo <strong>${opts.periodLabel}</strong> · espacio <strong>"${opts.workspaceName}"</strong>.`) +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px"><tr>
          ${stat('Ingresos', money(opts.income), ACCENT)}
          ${stat('Gastos', money(opts.expense), '#e11d48')}
          ${stat('Balance', money(opts.net), opts.net >= 0 ? ACCENT_DARK : '#d97706')}
          ${stat('Ahorro', `${opts.savingsRate.toFixed(0)}%`, '#2563eb')}
        </tr></table>` +
        (opts.topCategory ? paragraph(`Mayor gasto: <strong>${opts.topCategory.name}</strong> (${money(opts.topCategory.amount)}).`) : '') +
        `<div style="height:1px;background:${BORDER};margin:8px 0 18px"></div>` +
        textToHtml(opts.narrative) +
        button('Ver mi panel', `${opts.appUrl}/dashboard`),
    }),
  }
}

export function genericNotification(opts: {
  title: string
  message: string
  ctaLabel?: string
  ctaUrl?: string
}): EmailContent {
  return {
    subject: opts.title,
    html: baseLayout({
      preheader: opts.message.slice(0, 100),
      heading: opts.title,
      body: paragraph(opts.message) + (opts.ctaLabel && opts.ctaUrl ? button(opts.ctaLabel, opts.ctaUrl) : ''),
    }),
  }
}

// Envío vía Resend. Devuelve true si se envió (o false si no hay proveedor / error).
export async function sendEmail(to: string, content: EmailContent): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) return false
  const from = process.env.EMAIL_FROM || `${BRAND} <no-reply@notifications.juanmontoya.me>`
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject: content.subject, html: content.html }),
    })
    return res.ok
  } catch {
    return false
  }
}
