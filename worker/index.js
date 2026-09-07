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
  if (!Array.isArray(parsed?.candidates)) parsed = { ...DEMO, ...parsed, candidates: [] }
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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
    },
  })
}

export default {
  async fetch(request, env, ctx) {
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
        model: env.GEMINI_MODEL || 'gemini-3.6-flash',
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

        if (env.DEMO_MODE === 'true' || !env.GEMINI_API_KEY) {
          return json({ ...normalizeResult(structuredClone(DEMO)), demo: true })
        }

        const cleaned = imageBase64.replace(/^data:[^;]+;base64,/, '')
        const locationHint = location
          ? `拍攝座標約：緯度 ${Number(location.lat).toFixed(5)}, 經度 ${Number(location.lng).toFixed(5)}（香港附近）。`
          : '拍攝地點可能在香港。'
        const model = env.GEMINI_MODEL || 'gemini-3.6-flash'
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`

        const geminiRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `${PROMPT}\n${locationHint}` },
                  {
                    inline_data: {
                      mime_type: String(mimeType).includes('png') ? 'image/png' : 'image/jpeg',
                      data: cleaned,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          }),
        })

        if (!geminiRes.ok) {
          const errText = await geminiRes.text()
          console.warn('Gemini error', geminiRes.status, errText.slice(0, 300))
          if (env.ALLOW_DEMO_FALLBACK !== 'false') {
            const blocked = /location is not supported|User location/i.test(errText)
            return json({
              ...normalizeResult(structuredClone(DEMO)),
              demo: true,
              scanNotes: blocked
                ? 'Gemini API 目前不支援此地區 IP。已啟用示範資料。'
                : `Gemini 暫時無法連線。已改用示範資料。`,
            })
          }
          return json({ error: 'identify_failed', message: errText.slice(0, 200) }, 500)
        }

        const payload = await geminiRes.json()
        const text =
          payload?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
        let parsed
        try {
          parsed = JSON.parse(text)
        } catch {
          const match = text.match(/\{[\s\S]*\}/)
          if (!match) throw new Error('Model returned non-JSON')
          parsed = JSON.parse(match[0])
        }
        return json({ ...normalizeResult(parsed), demo: false })
      } catch (err) {
        console.error(err)
        if (env.ALLOW_DEMO_FALLBACK !== 'false') {
          return json({
            ...normalizeResult(structuredClone(DEMO)),
            demo: true,
            scanNotes: `辨識暫時失敗，已改用示範資料。`,
          })
        }
        return json({ error: 'identify_failed', message: String(err) }, 500)
      }
    }

    // Static assets (Workers Assets)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request)
    }
    return new Response('Not found', { status: 404 })
  },
}
