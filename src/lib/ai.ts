// Server-only. Generación de texto con DeepSeek (barato) y fallback a
// GPT-4o-mini si DeepSeek falla o no está configurado.

async function callChat(url: string, key: string, model: string, system: string, user: string): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.5,
      max_tokens: 900,
    }),
  })
  if (!res.ok) throw new Error(`${model}: ${res.status}`)
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error(`${model}: sin contenido`)
  return content as string
}

async function callChatJSON(url: string, key: string, model: string, system: string, user: string): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error(`${model}: ${res.status}`)
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error(`${model}: sin contenido`)
  return JSON.parse(content)
}

// Devuelve un objeto JSON del modelo (DeepSeek → GPT) o null si todos fallan.
export async function generateJSON(system: string, user: string): Promise<unknown | null> {
  const dk = process.env.DEEPSEEK_API_KEY
  if (dk) {
    try {
      return await callChatJSON('https://api.deepseek.com/chat/completions', dk, 'deepseek-chat', system, user)
    } catch (e) {
      console.error('DeepSeek JSON falló:', (e as Error).message)
    }
  }
  const ok = process.env.OPENAI_API_KEY
  if (ok) {
    try {
      return await callChatJSON('https://api.openai.com/v1/chat/completions', ok, 'gpt-4o-mini', system, user)
    } catch (e) {
      console.error('GPT JSON falló:', (e as Error).message)
    }
  }
  return null
}

// Devuelve el texto generado o null si no hay proveedor / todos fallan.
export async function generateReport(system: string, user: string): Promise<string | null> {
  const dk = process.env.DEEPSEEK_API_KEY
  if (dk) {
    try {
      return await callChat('https://api.deepseek.com/chat/completions', dk, 'deepseek-chat', system, user)
    } catch (e) {
      console.error('DeepSeek falló, intento GPT:', (e as Error).message)
    }
  }
  const ok = process.env.OPENAI_API_KEY
  if (ok) {
    try {
      return await callChat('https://api.openai.com/v1/chat/completions', ok, 'gpt-4o-mini', system, user)
    } catch (e) {
      console.error('GPT falló:', (e as Error).message)
    }
  }
  return null
}
