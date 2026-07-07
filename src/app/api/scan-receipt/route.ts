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

  let body: { image?: string }
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
  const prompt =
    'Eres un extractor de datos de recibos/facturas. Devuelve SOLO un JSON con: ' +
    '"amount" (número, el total pagado), "date" (YYYY-MM-DD; si no aparece usa ' + today + '), ' +
    '"description" (nombre corto del comercio o compra), "category" (categoría de gasto sugerida en español, ' +
    'ej: Alimentación, Transporte, Salud, Entretenimiento). Si algo no se ve, usa null.'

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
              { type: 'image_url', image_url: { url: image, detail: 'low' } },
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
    let parsed: { amount?: number; date?: string; description?: string; category?: string } = {}
    try {
      parsed = JSON.parse(content)
    } catch {
      return NextResponse.json({ error: 'Respuesta no parseable' }, { status: 502 })
    }

    return NextResponse.json({
      ok: true,
      amount: typeof parsed.amount === 'number' ? parsed.amount : null,
      date: parsed.date || today,
      description: parsed.description || '',
      category: parsed.category || '',
    })
  } catch {
    return NextResponse.json({ error: 'Error de red con el modelo' }, { status: 502 })
  }
}
