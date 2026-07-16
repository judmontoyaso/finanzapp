import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// POST /api/scan-receipt  { image: dataURI }
// Usa GPT-4o-mini (visión) para extraer monto, fecha, comercio y categoría
// sugerida de la foto de un recibo. Devuelve JSON para prellenar el formulario.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const key = process.env.OPENAI_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'Escaneo no configurado (falta OPENAI_API_KEY).' }, { status: 501 })
  }

  let body: { image?: string; categories?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
  }
  const image = body.image
  if (!image || !image.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Imagen inválida' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]
  const cats = Array.isArray(body.categories) ? body.categories.filter(Boolean).slice(0, 40) : []
  const catInstruction = cats.length
    ? `"category": elige EXACTAMENTE una de esta lista si encaja bien (o null si ninguna aplica): ${JSON.stringify(cats)}. `
    : '"category": categoría de gasto sugerida en español (o null). '
  const prompt =
    'Eres un extractor de datos de recibos/facturas. Devuelve SOLO un JSON con estos campos: ' +
    '"amount" (número, el total pagado, sin símbolos ni separadores de miles), ' +
    '"date" (YYYY-MM-DD; LEE la fecha EXACTAMENTE como está impresa, incluido el año; NO la inventes ni la corrijas; si no aparece usa ' + today + '), ' +
    '"description" (nombre corto del comercio o de la compra), ' +
    catInstruction +
    'Si ninguna categoría en la lista encaja bien, pon "category" como null y añade un objeto "newCategory" con "name" (nombre de la subcategoría/hijo sugerida, ej: "supermercado") y "parent" (nombre de la categoría principal/padre sugerida, ej: "Alimentación"). ' +
    ' "items": arreglo con las líneas del recibo, cada una {"description": nombre del producto, "amount": precio de esa línea como número}. ' +
    'Si no puedes leer las líneas, usa []. Si algún dato no se ve, usa null.'

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extrae los datos de este recibo.' },
              { type: 'image_url', image_url: { url: image, detail: 'high' } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 300,
        temperature: 0,
      }),
    })

    if (!res.ok) {
      const t = await res.text()
      return NextResponse.json({ error: 'Error del modelo', detail: t.slice(0, 200) }, { status: 502 })
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    let parsed: {
      amount?: number
      date?: string
      description?: string
      category?: string
      newCategory?: { name: string; parent: string } | null
      items?: { description?: string; amount?: number }[]
    } = {}
    try {
      parsed = JSON.parse(content)
    } catch {
      return NextResponse.json({ error: 'Respuesta no parseable' }, { status: 502 })
    }

    const items = Array.isArray(parsed.items)
      ? parsed.items
          .filter((it) => it && (it.description || typeof it.amount === 'number'))
          .map((it) => ({ description: String(it.description || '').slice(0, 120), amount: typeof it.amount === 'number' ? it.amount : 0 }))
          .slice(0, 50)
      : []

    return NextResponse.json({
      ok: true,
      amount: typeof parsed.amount === 'number' ? parsed.amount : null,
      date: parsed.date || today,
      description: parsed.description || '',
      category: parsed.category || '',
      newCategory: parsed.newCategory || null,
      items,
    })
  } catch {
    return NextResponse.json({ error: 'Error de red con el modelo' }, { status: 502 })
  }
}
