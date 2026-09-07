import cors from 'cors'
import express from 'express'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const i = trimmed.indexOf('=')
      if (i === -1) continue
      const key = trimmed.slice(0, i).trim()
      const value = trimmed.slice(i + 1).trim()
      if (!(key in process.env)) process.env[key] = value
    }
  } catch {
    // optional
  }
}

loadEnv()

const PORT = Number(process.env.PORT || 8787)
const FORCE_DEMO = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true'
const ALLOW_DEMO_FALLBACK = process.env.ALLOW_DEMO_FALLBACK !== 'false'
const REVERSE_BASE = (process.env.REVERSE_GEMINI_BASE || '').replace(/\/$/, '')
const REVERSE_TOKEN = (process.env.REVERSE_API_TOKEN || '').trim()
const MODEL = process.env.REVERSE_GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-3.6-flash-medium'
const USE_REVERSE = Boolean(REVERSE_BASE && REVERSE_TOKEN)

if (!USE_REVERSE && !FORCE_DEMO) {
  console.error('Missing REVERSE_GEMINI_BASE / REVERSE_API_TOKEN in .env')
  process.exit(1)
}

const JSON_MODE_INSTRUCTION =
  'Output requirements: return a single raw JSON value and nothing else. No prose before or after it, no explanation, and no markdown code fences.'

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

const DEMO_POOL = [
  {
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
      {
        commonNameZh: '樹鵲',
        commonNameEn: 'Grey Treepie',
        scientificName: 'Dendrocitta formosae',
        confidence: 0.62,
        rarity: 'uncommon',
        habitat: '林地、郊野公園',
        hkRelevance: '較常於新界林地出現。',
        traits: ['灰褐體色', '長尾', '群棲'],
        funFact: '樹鵲的叫聲有時像金屬摩擦聲。',
        conservation: '普遍物種',
      },
      {
        commonNameZh: '烏鴉',
        commonNameEn: 'Large-billed Crow',
        scientificName: 'Corvus macrorhynchos',
        confidence: 0.44,
        rarity: 'common',
        habitat: '市區至郊野',
        hkRelevance: '香港常見大型鴉科。',
        traits: ['全黑', '厚嘴', '聰明'],
        funFact: '具工具使用與臉孔辨識能力的研究紀錄。',
        conservation: '普遍',
      },
    ],
  },
  {
    detected: true,
    category: 'plant',
    scanNotes: '示範模式 · 模擬香港常見植物掃描',
    candidates: [
      {
        commonNameZh: '洋紫荊',
        commonNameEn: 'Hong Kong Orchid Tree',
        scientificName: 'Bauhinia × blakeana',
        confidence: 0.88,
        rarity: 'common',
        habitat: '市區綠化、公園、行道樹',
        hkRelevance: '香港市花，旗與徽章常見圖案。',
        traits: ['心形裂葉', '紫紅花', '不結實'],
        funFact: '此雜交種幾乎不結果，多以扦插繁殖。',
        conservation: '廣泛栽植',
      },
      {
        commonNameZh: '宮粉羊蹄甲',
        commonNameEn: 'Camel\'s Foot Tree',
        scientificName: 'Bauhinia variegata',
        confidence: 0.71,
        rarity: 'common',
        habitat: '公園、路邊',
        hkRelevance: '春季粉白至淡紫花海，常被誤認為洋紫荊。',
        traits: ['裂葉', '春花', '可結莢'],
        funFact: '與市花外貌相近，可從果莢分辨。',
        conservation: '常見園景樹',
      },
    ],
  },
  {
    detected: true,
    category: 'insect',
    scanNotes: '示範模式 · 模擬紅樹林生態掃描',
    candidates: [
      {
        commonNameZh: '招潮蟹',
        commonNameEn: 'Fiddler Crab',
        scientificName: 'Austruca spp.',
        confidence: 0.86,
        rarity: 'uncommon',
        habitat: '泥灘、紅樹林潮間帶',
        hkRelevance: '荔枝窩、米埔等泥灘常見。',
        traits: ['雄蟹巨螯', '挖洞', '揮螯求偶'],
        funFact: '巨螯同時用於求偶展示與打鬥。',
        conservation: '依賴完整泥灘生境',
      },
      {
        commonNameZh: '彈塗魚',
        commonNameEn: 'Mudskipper',
        scientificName: 'Periophthalmus spp.',
        confidence: 0.57,
        rarity: 'uncommon',
        habitat: '紅樹林、泥灘',
        hkRelevance: '香港泥灘代表性兩棲性魚類。',
        traits: ['突出眼', '用鰭爬行', '皮膚呼吸'],
        funFact: '可以在退潮泥面「走路」。',
        conservation: '對水質與棲地敏感',
      },
    ],
  },
]

function normalizeResult(parsed) {
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

function demoResult() {
  const pick = DEMO_POOL[Math.floor(Math.random() * DEMO_POOL.length)]
  return normalizeResult(structuredClone(pick))
}

function isLocationBlocked(err) {
  const msg = err instanceof Error ? err.message : String(err)
  return /location is not supported/i.test(msg) || /User location/i.test(msg)
}

function parseModelJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    const match = String(text || '').match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Model returned non-JSON')
    return JSON.parse(match[0])
  }
}

async function identifyViaReverse(cleaned, mimeType, locationHint) {
  const filename = String(mimeType).includes('png') ? 'capture.png' : 'capture.jpg'
  const mediaType = String(mimeType).includes('png') ? 'image/png' : 'image/jpeg'
  const prompt = [
    `First, open and read the attached file: ${filename}. They are staged on disk rather than included in this message, so their contents are not visible until you read them. Answer from what they actually show.`,
    `${PROMPT}\n${locationHint}`,
    JSON_MODE_INSTRUCTION,
  ].join('\n\n')

  const response = await fetch(`${REVERSE_BASE}/v1/generate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${REVERSE_TOKEN}`,
      'x-request-id': `yezhi-${randomUUID()}`,
    },
    body: JSON.stringify({
      model: MODEL,
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

  const body = await response.json().catch(() => ({}))
  if (!response.ok || body?.ok === false) {
    const detail =
      (typeof body?.error === 'object' && body.error?.message) ||
      body?.error ||
      body?.detail ||
      `HTTP ${response.status}`
    throw new Error(String(detail).slice(0, 240))
  }

  const text = String(body?.text || '').trim()
  if (!text) throw new Error('reverse API returned empty text')
  return normalizeResult(parseModelJson(text))
}

const app = express()
app.use(cors({ origin: true }))
app.use(express.json({ limit: '12mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: '野誌 identify',
    provider: USE_REVERSE ? 'reverse' : 'demo',
    demo: FORCE_DEMO,
    model: MODEL,
  })
})

app.post('/api/identify', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', location } = req.body || {}
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 required' })
    }

    if (FORCE_DEMO || !USE_REVERSE) {
      return res.json({ ...demoResult(), demo: true })
    }

    const cleaned = imageBase64.replace(/^data:[^;]+;base64,/, '')
    const locationHint = location
      ? `拍攝座標約：緯度 ${Number(location.lat).toFixed(5)}, 經度 ${Number(location.lng).toFixed(5)}（香港附近）。`
      : '拍攝地點可能在香港。'

    try {
      const parsed = await identifyViaReverse(cleaned, mimeType, locationHint)
      return res.json({ ...parsed, demo: false, provider: 'reverse' })
    } catch (err) {
      if (ALLOW_DEMO_FALLBACK) {
        console.warn('Reverse Gemini failed; serving demo fallback:', err instanceof Error ? err.message : err)
        return res.json({
          ...demoResult(),
          demo: true,
          scanNotes: `Reverse API 暫時無法連線（${err instanceof Error ? err.message.slice(0, 80) : 'error'}）。已改用示範資料。`,
        })
      }
      throw err
    }
  } catch (err) {
    console.error(err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    const locationBlocked = isLocationBlocked(err)
    res.status(500).json({
      error: locationBlocked ? 'region_blocked' : 'identify_failed',
      message,
    })
  }
})

const distDir = resolve(__dirname, '../dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(resolve(distDir, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`野誌 listening on http://localhost:${PORT}`)
  console.log(
    `provider=${USE_REVERSE ? 'reverse' : 'demo'} model=${MODEL} demo=${FORCE_DEMO} fallback=${ALLOW_DEMO_FALLBACK} static=${existsSync(distDir)}`,
  )
})
