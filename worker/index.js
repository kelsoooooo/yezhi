const PROMPT = `你是 SPECTRA 野外生物掃描系統的物種鑑定模組，專精香港及華南常見動植物。
請分析影像中的主要生物（動植物、真菌亦可），回傳嚴格 JSON（不要 markdown）：
{
  "detected": boolean,
  "category": "animal" | "plant" | "fungus" | "insect" | "bird" | "other" | "unknown",
  "candidates": [
    {
      "commonNameZh": string,
      "commonNameEn": string,
      "scientificName": string,
      "confidence": number,
      "rarity": "common" | "uncommon" | "rare" | "legendary",
      "habitat": string,
      "hkRelevance": string,
      "traits": string[],
      "funFact": string,
      "conservation": string
    }
  ],
  "scanNotes": string
}

規則：
1. candidates 依信心度由高到低，最多 4 個；confidence 為 0-1。
2. 若無法辨識生物，detected=false，candidates=[]。
3. 優先香港常見物種；說明簡短、生動、適合圖鑑。
4. rarity 依香港野外遇見機率粗估。
5. 全文用繁體中文（學名與英文名除外）。`

const JSON_MODE_INSTRUCTION =
  'Output requirements: return a single raw JSON value and nothing else. No prose before or after it, no explanation, and no markdown code fences.'

const DEMO = {
  detected: true,
  category: 'bird',
  scanNotes: '示範模式 · 模擬香港常見鳥類掃描',
  candidates: [
    {
      commonNameZh: '喜鵲',
      commonNameEn: 'Oriental Magpie',
      scientificName: 'Pica serica',
      confidence: 0.91,
      rarity: 'common',
      habitat: '市區公園、郊野邊緣、開闊林地',
      hkRelevance: '香港市區極常見，常成對或小群活動。',
      traits: ['黑白對比羽色', '長尾', '鳴聲響亮'],
      funFact: '喜鵲會利用都市反光玻璃與天線作為哨站。',
      conservation: '無特別保育等級，族群穩定',
    },
  ],
}

function normalizeResult(parsed) {
  if (!parsed || typeof parsed !== 'object') parsed = { ...DEMO, candidates: [] }
  if (!Array.isArray(parsed.candidates)) parsed.candidates = []
  parsed.candidates = parsed.candidates
    .slice(0, 4)
    .map((c) => ({
      ...c,
      confidence: Math.max(0, Math.min(1, Number(c.confidence) || 0)),
      traits: Array.isArray(c.traits) ? c.traits.slice(0, 5) : [],
    }))
    .sort((a, b) => b.confidence - a.confidence)
  return parsed
}

function parseJsonText(text) {
  try {
    return JSON.parse(text)
  } catch {
    const match = String(text || '').match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Model returned non-JSON')
    return JSON.parse(match[0])
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
    },
  })
}

function reverseConfigured(env) {
  return Boolean(env.REVERSE_GEMINI_BASE && env.REVERSE_API_TOKEN)
}

async function identifyViaReverse(env, cleaned, mimeType, locationHint) {
  const base = String(env.REVERSE_GEMINI_BASE).replace(/\/$/, '')
  const model = env.REVERSE_GEMINI_MODEL || 'gemini-3.6-flash-medium'
  const filename = String(mimeType).includes('png') ? 'capture.png' : 'capture.jpg'
  const mediaType = String(mimeType).includes('png') ? 'image/png' : 'image/jpeg'
  const prompt = [
    `First, open and read the attached file: ${filename}. They are staged on disk rather than included in this message, so their contents are not visible until you read them. Answer from what they actually show.`,
    `${PROMPT}\n${locationHint}`,
    JSON_MODE_INSTRUCTION,
  ].join('\n\n')

  const reverseRes = await fetch(`${base}/v1/generate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.REVERSE_API_TOKEN}`,
      'x-request-id': `yezhi-${crypto.randomUUID()}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      attachments: [
        {
          filename,
          media_type: mediaType,
          data: cleaned,
        },
      ],
    }),
  })

  const body = await reverseRes.json().catch(() => ({}))
  if (!reverseRes.ok || body?.ok === false) {
    const detail =
      (typeof body?.error === 'object' && body.error?.message) ||
      body?.error ||
      body?.detail ||
      `HTTP ${reverseRes.status}`
    throw new Error(String(detail).slice(0, 240))
  }

  const text = String(body?.text || '').trim()
  if (!text) throw new Error('reverse API returned empty text')
  return normalizeResult(parseJsonText(text))
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': 'content-type',
        },
      })
    }

    if (url.pathname === '/api/health') {
      return json({
        ok: true,
        service: '野誌 identify',
        provider: reverseConfigured(env) ? 'reverse' : 'demo',
        model: env.REVERSE_GEMINI_MODEL || 'gemini-3.6-flash-medium',
        demo: env.DEMO_MODE === 'true',
      })
    }

    if (url.pathname === '/api/identify' && request.method === 'POST') {
      try {
        const body = await request.json()
        const imageBase64 = body?.imageBase64
        const mimeType = body?.mimeType || 'image/jpeg'
        const location = body?.location
        if (!imageBase64 || typeof imageBase64 !== 'string') {
          return json({ error: 'imageBase64 required' }, 400)
        }

        if (env.DEMO_MODE === 'true' || !reverseConfigured(env)) {
          return json({ ...normalizeResult(structuredClone(DEMO)), demo: true })
        }

        const cleaned = imageBase64.replace(/^data:[^;]+;base64,/, '')
        const locationHint = location
          ? `拍攝座標約：緯度 ${Number(location.lat).toFixed(5)}, 經度 ${Number(location.lng).toFixed(5)}（香港附近）。`
          : '拍攝地點可能在香港。'

        const parsed = await identifyViaReverse(env, cleaned, mimeType, locationHint)
        return json({ ...parsed, demo: false, provider: 'reverse' })
      } catch (err) {
        console.error(err)
        if (env.ALLOW_DEMO_FALLBACK !== 'false') {
          return json({
            ...normalizeResult(structuredClone(DEMO)),
            demo: true,
            scanNotes: `辨識暫時失敗（${err instanceof Error ? err.message.slice(0, 80) : 'error'}），已改用示範資料。`,
          })
        }
        return json({ error: 'identify_failed', message: String(err) }, 500)
      }
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request)
    }
    return new Response('Not found', { status: 404 })
  },
}
