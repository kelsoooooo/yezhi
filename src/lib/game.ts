import type { CodexEntry, GeoPoint, IdentifyResult, PlayerState, Rarity, SpeciesCandidate } from '../types'

const STORAGE_KEY = 'spectra-field-ops-v1'

export const RARITY_XP: Record<Rarity, number> = {
  common: 40,
  uncommon: 80,
  rare: 160,
  legendary: 320,
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: '常見',
  uncommon: '少見',
  rare: '稀有',
  legendary: '傳奇',
}

export function speciesId(c: SpeciesCandidate): string {
  const sci = (c.scientificName || '').trim().toLowerCase()
  if (sci) return sci.replace(/\s+/g, '-')
  return (c.commonNameZh || c.commonNameEn || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
}

export function xpForLevel(level: number): number {
  return Math.floor(120 * Math.pow(level, 1.45))
}

export function levelFromXp(xp: number): number {
  let level = 1
  while (xp >= xpForLevel(level + 1)) level += 1
  return level
}

export function defaultState(): PlayerState {
  return {
    xp: 0,
    level: 1,
    totalScans: 0,
    unlocks: 0,
    codex: {},
  }
}

export function loadState(): PlayerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as PlayerState
    return {
      ...defaultState(),
      ...parsed,
      codex: parsed.codex || {},
    }
  } catch {
    return defaultState()
  }
}

export function saveState(state: PlayerState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearState(): PlayerState {
  const next = defaultState()
  saveState(next)
  return next
}

const DEMO_SEED: Array<{
  category: CodexEntry['category']
  photo: string
  location: GeoPoint
  sightings: number
  daysAgo: number
  candidate: SpeciesCandidate
}> = [
  {
    category: 'bird',
    photo: '/species/kingfisher.jpg',
    location: { lat: 22.4689, lng: 114.0521 },
    sightings: 3,
    daysAgo: 5,
    candidate: {
      commonNameZh: '普通翠鳥',
      commonNameEn: 'Common Kingfisher',
      scientificName: 'Alcedo atthis',
      confidence: 0.94,
      rarity: 'uncommon',
      habitat: '溪流、濕地、魚塘邊緣',
      hkRelevance: '香港濕地與城門溪澗常見的寶石色水鳥。',
      traits: ['翠藍背羽', '橙腹', '直線飛行'],
      funFact: '潛水捕魚前會在枝頭靜靜停駐，像一滴凝固的水色。',
      conservation: '普遍物種，依賴清淨水域',
    },
  },
  {
    category: 'bird',
    photo: '/species/black-faced-spoonbill.jpg',
    location: { lat: 22.4902, lng: 114.0456 },
    sightings: 1,
    daysAgo: 12,
    candidate: {
      commonNameZh: '黑臉琵鷺',
      commonNameEn: 'Black-faced Spoonbill',
      scientificName: 'Platalea minor',
      confidence: 0.91,
      rarity: 'legendary',
      habitat: '潮間帶、基圍、濕地',
      hkRelevance: '米埔是其全球重要度冬地之一。',
      traits: ['黑色臉部', '匙狀喙', '冬候鳥'],
      funFact: '全球族群稀少，每一隻被記錄都像寫下一封給濕地的信。',
      conservation: '全球瀕危，受嚴格保護',
    },
  },
  {
    category: 'animal',
    photo: '/species/fiddler-crab.jpg',
    location: { lat: 22.5265, lng: 114.2078 },
    sightings: 4,
    daysAgo: 2,
    candidate: {
      commonNameZh: '招潮蟹',
      commonNameEn: 'Fiddler Crab',
      scientificName: 'Austruca spp.',
      confidence: 0.89,
      rarity: 'uncommon',
      habitat: '紅樹林泥灘',
      hkRelevance: '荔枝窩退潮泥面最生動的居民。',
      traits: ['雄蟹巨螯', '挖洞', '揮螯'],
      funFact: '巨螯既是情書，也是戰書。',
      conservation: '依賴完整泥灘生境',
    },
  },
  {
    category: 'insect',
    photo: '/species/graphium.jpg',
    location: { lat: 22.2578, lng: 113.9524 },
    sightings: 2,
    daysAgo: 8,
    candidate: {
      commonNameZh: '青鳳蝶',
      commonNameEn: 'Common Bluebottle',
      scientificName: 'Graphium sarpedon',
      confidence: 0.87,
      rarity: 'common',
      habitat: '山地林緣、鳳凰徑一帶',
      hkRelevance: '香港郊野常見的藍綠閃光鳳蝶。',
      traits: ['三角翅', '青绿斑帶', '快速飛行'],
      funFact: '陽光下翅斑會像水面一樣輕輕發亮。',
      conservation: '普遍',
    },
  },
  {
    category: 'plant',
    photo: '/species/kandelia.jpg',
    location: { lat: 22.5265, lng: 114.2078 },
    sightings: 2,
    daysAgo: 3,
    candidate: {
      commonNameZh: '秋茄',
      commonNameEn: 'Kandelia',
      scientificName: 'Kandelia obovata',
      confidence: 0.9,
      rarity: 'common',
      habitat: '紅樹林潮間帶',
      hkRelevance: '香港紅樹林優勢樹種之一。',
      traits: ['胎生苗', '橢圓葉', '支柱根少'],
      funFact: '種子在母樹上發芽後才掉落泥中扎根。',
      conservation: '紅樹林生境受保護',
    },
  },
  {
    category: 'bird',
    photo: '/species/egret.jpg',
    location: { lat: 22.3886, lng: 114.1451 },
    sightings: 5,
    daysAgo: 1,
    candidate: {
      commonNameZh: '小白鷺',
      commonNameEn: 'Little Egret',
      scientificName: 'Egretta garzetta',
      confidence: 0.93,
      rarity: 'common',
      habitat: '魚塘、河涌、海岸',
      hkRelevance: '香港最容易遇見的白鷺之一。',
      traits: ['全白', '黑嘴黑腳', '繁殖期飾羽'],
      funFact: '涉水時步伐輕得像在抄寫水面的句子。',
      conservation: '普遍',
    },
  },
  {
    category: 'animal',
    photo: '/species/tree-frog.jpg',
    location: { lat: 22.3886, lng: 114.1451 },
    sightings: 1,
    daysAgo: 9,
    candidate: {
      commonNameZh: '斑腿樹蛙',
      commonNameEn: 'Brown Tree Frog',
      scientificName: 'Polypedates megacephalus',
      confidence: 0.86,
      rarity: 'uncommon',
      habitat: '溪澗、灌叢、雨後積水',
      hkRelevance: '城門等郊野雨季常聞其鳴。',
      traits: ['吸盤趾', '夜鳴', '樹棲'],
      funFact: '鳴聲像小聲爭執，其實是求偶的節奏。',
      conservation: '對水質敏感',
    },
  },
  {
    category: 'plant',
    photo: '/species/water-lily.jpg',
    location: { lat: 22.4689, lng: 114.0521 },
    sightings: 2,
    daysAgo: 6,
    candidate: {
      commonNameZh: '睡蓮',
      commonNameEn: 'Water Lily',
      scientificName: 'Nymphaea spp.',
      confidence: 0.88,
      rarity: 'common',
      habitat: '靜水池塘',
      hkRelevance: '濕地公園與公園水景常見栽植。',
      traits: ['浮葉', '晝開夜合', '清香'],
      funFact: '葉面不沾水，像一封不肯被打濕的短箋。',
      conservation: '園藝普遍',
    },
  },
]

/** 清空圖鑑並寫入示範觀察紀錄（錄影／簡報用） */
export function resetWithDemoData(): PlayerState {
  const now = Date.now()
  const codex: Record<string, CodexEntry> = {}
  let xp = 0

  for (const item of DEMO_SEED) {
    const id = speciesId(item.candidate)
    const candidate = item.candidate
    codex[id] = {
      id,
      candidate,
      category: item.category,
      firstSeenAt: now - item.daysAgo * 86_400_000,
      sightings: item.sightings,
      bestConfidence: candidate.confidence,
      photoDataUrl: item.photo,
      locations: [item.location],
    }
    xp += RARITY_XP[candidate.rarity] + Math.round(candidate.confidence * 30) + 50
  }

  xp += 120
  const next: PlayerState = {
    xp,
    level: levelFromXp(xp),
    totalScans: DEMO_SEED.length + 3,
    unlocks: DEMO_SEED.length,
    codex,
  }
  saveState(next)
  return next
}

export const DEMO_VIDEO_PLAYLIST = [
  '/demo/clips/01-kingfisher.webm',
  '/demo/clips/02-butterfly.webm',
  '/demo/clips/03-bee.webm',
  '/demo/clips/04-heron.webm',
]

export const DEMO_MODE_KEY = 'yezhi-demo-mode'


export interface UnlockResult {
  state: PlayerState
  unlocked: boolean
  entry: CodexEntry
  gainedXp: number
  leveledUp: boolean
}

export function registerDiscovery(
  state: PlayerState,
  result: IdentifyResult,
  candidate: SpeciesCandidate,
  photoDataUrl: string | undefined,
  location: GeoPoint | null,
): UnlockResult {
  const id = speciesId(candidate)
  const existing = state.codex[id]
  const unlocked = !existing
  const baseXp = Math.round(RARITY_XP[candidate.rarity] || RARITY_XP.common)
  const confBonus = Math.round(candidate.confidence * 30)
  const firstBonus = unlocked ? 50 : 10
  const gainedXp = baseXp + confBonus + firstBonus
  const prevLevel = state.level

  const locations = [...(existing?.locations || [])]
  if (location) {
    locations.push(location)
    if (locations.length > 40) locations.shift()
  }

  const entry: CodexEntry = {
    id,
    candidate: {
      ...candidate,
      ...(existing && existing.bestConfidence > candidate.confidence
        ? {
            commonNameZh: existing.candidate.commonNameZh,
            commonNameEn: existing.candidate.commonNameEn,
            scientificName: existing.candidate.scientificName,
          }
        : {}),
    },
    category: result.category,
    firstSeenAt: existing?.firstSeenAt ?? Date.now(),
    sightings: (existing?.sightings || 0) + 1,
    bestConfidence: Math.max(existing?.bestConfidence || 0, candidate.confidence),
    photoDataUrl: photoDataUrl || existing?.photoDataUrl,
    locations,
  }

  if (candidate.confidence >= (existing?.bestConfidence || 0)) {
    entry.candidate = candidate
  }

  const nextXp = state.xp + gainedXp
  const next: PlayerState = {
    ...state,
    xp: nextXp,
    level: levelFromXp(nextXp),
    totalScans: state.totalScans + 1,
    unlocks: state.unlocks + (unlocked ? 1 : 0),
    codex: { ...state.codex, [id]: entry },
  }

  saveState(next)
  return {
    state: next,
    unlocked,
    entry,
    gainedXp,
    leveledUp: next.level > prevLevel,
  }
}

export function codexList(state: PlayerState): CodexEntry[] {
  return Object.values(state.codex).sort(
    (a: CodexEntry, b: CodexEntry) => b.firstSeenAt - a.firstSeenAt,
  )
}

export const HK_HOTSPOTS = [
  {
    name: '荔枝窩',
    lat: 22.5265,
    lng: 114.2078,
    hint: '紅樹林與泥灘',
    blurb: '新界東北的客家村落與潮間帶，退潮時最宜靜觀。',
    cover: '/places/lai-chi-wo.jpg',
    species: [
      { name: '招潮蟹', kind: '甲殼', image: '/species/fiddler-crab.jpg' },
      { name: '彈塗魚', kind: '魚類', image: '/species/mudskipper.jpg' },
      { name: '秋茄', kind: '紅樹', image: '/species/kandelia.jpg' },
      { name: '白骨壤', kind: '紅樹', image: '/species/avicennia.jpg' },
      { name: '蒼鷺', kind: '鳥類', image: '/species/grey-heron.jpg' },
    ],
  },
  {
    name: '大埔滘',
    lat: 22.4305,
    lng: 114.1832,
    hint: '原生林與鳥道',
    blurb: '香港少數較完整的低地常綠闊葉林，晨昏鳥聲最密。',
    cover: '/places/tai-po-kau.jpg',
    species: [
      { name: '紅嘴相思', kind: '鳥類', image: '/species/red-billed-leiothrix.jpg' },
      { name: '藍地鴝', kind: '鳥類', image: '/species/siberian-blue-robin.jpg' },
      { name: '銀耳相思鳥', kind: '鳥類', image: '/species/silver-eared-mesia.jpg' },
      { name: '豬籠草', kind: '植物', image: '/species/nepenthes.jpg' },
      { name: '香港茶', kind: '植物', image: '/species/camellia-hk.jpg' },
    ],
  },
  {
    name: '米埔',
    lat: 22.4902,
    lng: 114.0456,
    hint: '濕地與候鳥',
    blurb: '拉姆薩爾濕地，冬候鳥過境時的重要停泊站。',
    cover: '/places/mai-po.jpg',
    species: [
      { name: '黑臉琵鷺', kind: '鳥類', image: '/species/black-faced-spoonbill.jpg' },
      { name: '大濱鷸', kind: '鳥類', image: '/species/great-knot.jpg' },
      { name: '反嘴鷸', kind: '鳥類', image: '/species/avocet.jpg' },
      { name: '蘆葦', kind: '植物', image: '/species/reed.jpg' },
      { name: '彈塗魚', kind: '魚類', image: '/species/mudskipper.jpg' },
    ],
  },
  {
    name: '西貢萬宜',
    lat: 22.3598,
    lng: 114.3712,
    hint: '海岸與地質岸線',
    blurb: '六角岩柱與清澈海灣，潮池裡藏著小型海岸生物。',
    cover: '/places/sai-kung.jpg',
    species: [
      { name: '石蚵', kind: '貝類', image: '/species/oyster.jpg' },
      { name: '濱螺', kind: '貝類', image: '/species/periwinkle.jpg' },
      { name: '馬尾藻', kind: '藻類', image: '/species/sargassum.jpg' },
      { name: '白腹海鵰', kind: '鳥類', image: '/species/white-bellied-sea-eagle.jpg' },
      { name: '露兜樹', kind: '植物', image: '/species/pandanus.jpg' },
    ],
  },
  {
    name: '大嶼山鳳凰徑',
    lat: 22.2578,
    lng: 113.9524,
    hint: '山地草坡',
    blurb: '高海拔風速大，蝴蝶與耐旱灌叢輪流登場。',
    cover: '/places/lantau.jpg',
    species: [
      { name: '青鳳蝶', kind: '昆蟲', image: '/species/graphium.jpg' },
      { name: '柑橘鳳蝶', kind: '昆蟲', image: '/species/papilio-xuthus.jpg' },
      { name: '芒草', kind: '植物', image: '/species/miscanthus.jpg' },
      { name: '杜鵑', kind: '植物', image: '/species/rhododendron.jpg' },
      { name: '大冠鷲', kind: '鳥類', image: '/species/crested-serpent-eagle.jpg' },
    ],
  },
  {
    name: '城門郊野公園',
    lat: 22.3886,
    lng: 114.1451,
    hint: '溪澗與兩棲',
    blurb: '水塘上游的陰涼溪谷，雨後特別適合找兩棲類。',
    cover: '/places/shing-mun.jpg',
    species: [
      { name: '香港湍蛙', kind: '兩棲', image: '/species/hong-kong-cascade-frog.jpg' },
      { name: '小樹蛙', kind: '兩棲', image: '/species/tree-frog.jpg' },
      { name: '溪蟹', kind: '甲殼', image: '/species/freshwater-crab.jpg' },
      { name: '海金沙', kind: '植物', image: '/species/lygodium.jpg' },
      { name: '白鷺', kind: '鳥類', image: '/species/egret.jpg' },
    ],
  },
  {
    name: '南丫島',
    lat: 22.2135,
    lng: 114.1208,
    hint: '海岸灌叢',
    blurb: '慢島節奏與開闊海岸線，黃昏適合觀鳥與潮間帶散步。',
    cover: '/places/lamma.jpg',
    species: [
      { name: '家燕', kind: '鳥類', image: '/species/barn-swallow.jpg' },
      { name: '白腹秧雞', kind: '鳥類', image: '/species/waterhen.jpg' },
      { name: '黃槿', kind: '植物', image: '/species/hibiscus-tiliaceus.jpg' },
      { name: '馬纓丹', kind: '植物', image: '/species/lantana.jpg' },
      { name: '寄居蟹', kind: '甲殼', image: '/species/hermit-crab.jpg' },
    ],
  },
  {
    name: '香港濕地公園',
    lat: 22.4689,
    lng: 114.0521,
    hint: '教育濕地',
    blurb: '為大眾設計的濕地教室，四季都有可觀察的水鳥與水生植物。',
    cover: '/places/wetland-park.jpg',
    species: [
      { name: '小䴙䴘', kind: '鳥類', image: '/species/little-grebe.jpg' },
      { name: '普通翠鳥', kind: '鳥類', image: '/species/kingfisher.jpg' },
      { name: '睡蓮', kind: '植物', image: '/species/water-lily.jpg' },
      { name: '東方大葦鶯', kind: '鳥類', image: '/species/oriental-reed-warbler.jpg' },
      { name: '水黽', kind: '昆蟲', image: '/species/water-strider.jpg' },
    ],
  },
] as const
