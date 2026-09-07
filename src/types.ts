export type SpeciesCategory =
  | 'animal'
  | 'plant'
  | 'fungus'
  | 'insect'
  | 'bird'
  | 'other'
  | 'unknown'

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary'

export interface SpeciesCandidate {
  commonNameZh: string
  commonNameEn: string
  scientificName: string
  confidence: number
  rarity: Rarity
  habitat: string
  hkRelevance: string
  traits: string[]
  funFact: string
  conservation: string
}

export interface IdentifyResult {
  detected: boolean
  category: SpeciesCategory
  candidates: SpeciesCandidate[]
  scanNotes?: string
  demo?: boolean
}

export interface GeoPoint {
  lat: number
  lng: number
}

export interface CodexEntry {
  id: string
  candidate: SpeciesCandidate
  category: SpeciesCategory
  firstSeenAt: number
  sightings: number
  bestConfidence: number
  photoDataUrl?: string
  locations: GeoPoint[]
}

export interface PlayerState {
  xp: number
  level: number
  totalScans: number
  unlocks: number
  codex: Record<string, CodexEntry>
}

export type AppView = 'scanner' | 'codex' | 'map'
