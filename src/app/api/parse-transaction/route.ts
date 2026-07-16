import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateJSON } from '@/lib/ai'

// POST /api/parse-transaction { text, categories:[{name,type}], today }
// Interpreta texto en lenguaje natural -> movimiento estructurado. Sirve para
// registro por voz/texto (#4) y sugerencia de categoría (#3, con solo la desc).
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: { text?: string; categories?: { name: string; type: string }[]; today?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }
  const text = (body.text || '').trim()
  if (!text) return NextResponse.json({ error: 'Texto vacío' }, { status: 400 })

  const today = body.today || new Date().toISOString().split('T')[0]
  const cats = Array.isArray(body.categories) ? body.categories.slice(0, 60) : []
  const catList = cats.map((c) => `${c.name} (${c.type === 'income' ? 'ingreso' : 'gasto'})`).join(', ')

  const system =
    'Eres un asistente que convierte texto en español a un movimiento financiero en JSON. ' +
    'Devuelve SOLO JSON con: "amount" (número sin símbolos ni separadores de miles, o null), ' +
    '"type" ("income" o "expense"), ' +
    `"date" (YYYY-MM-DD; interpreta "hoy"=${today}, "ayer", "anteayer", nombres de días o fechas relativas respecto a ${today}; si no se menciona, usa ${today}), ` +
    '"description" (breve, sin el monto), ' +
    (catList
      ? `"category" (elige EXACTAMENTE una de esta lista si encaja bien con la descripción, o null si ninguna encaja): ${catList}. `
      : '"category" (null). ') +
    'Si ninguna categoría de la lista encaja bien, pon "category" como null y sugiere una nueva categoría agregando un objeto "newCategory" con "name" (nombre de la subcategoría/hijo, ej: "celular") y "parent" (nombre del grupo/categoría principal, ej: "deuda"). ' +
    'Interpreta montos coloquiales: "50 mil"=50000, "2k"=2000, "1.5 millones"=1500000. Si es un gasto usa expense; ingresos/pagos recibidos usan income.'

  const parsed = (await generateJSON(system, `Texto: "${text}"`)) as {
    amount?: number
    type?: string
    date?: string
    description?: string
    category?: string
    newCategory?: { name: string; parent: string } | null
  } | null

  if (!parsed) {
    return NextResponse.json({ error: 'IA no disponible (configura DEEPSEEK_API_KEY u OPENAI_API_KEY).' }, { status: 501 })
  }

  return NextResponse.json({
    ok: true,
    amount: typeof parsed.amount === 'number' ? parsed.amount : null,
    type: parsed.type === 'income' ? 'income' : 'expense',
    date: parsed.date || today,
    description: parsed.description || '',
    category: parsed.category || '',
    newCategory: parsed.newCategory || null,
  })
}
