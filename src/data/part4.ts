// ─────────────────────────────────────────────────────────────────────────────
// PART IV: THE ASSUMPTIONS, NAMED · findings F14–F17
// Sources: attribute_summary.json (693 cards / 375 headline, AC1 ≥ 0.4 gate,
//   qwen3_vl primary), attribute_distance_bridge.json (F16 η² decomposition),
//   distances_clip.json (F17 CLIP replication). Verification rates 95.2% batch /
//   99.1% per-item from ui_findings_handbook.md (promoted_spotcheck.json).
// ─────────────────────────────────────────────────────────────────────────────
import attrSummary from './cultural/attribute_summary.json'
import bridge from './cultural/attribute_distance_bridge.json'
import clipDist from './cultural/distances_clip.json'
import type { Sit, Code } from './part1'
import { Q_LABELS } from './part3'

/* F14: assumption cards */
export interface Card {
  question_id: string
  question: string
  assumed_value: string
  consistency: number
  tier: string // 'headline' | 'secondary' | 'excluded_low_agreement'
  kappa?: number | null
  ac1?: number | null
}
type SummaryResults = Record<string, Record<string, Card[]>>
export const ATTR = attrSummary.results as unknown as SummaryResults

export function cardsFor(sit: Sit, code: Code | 'default'): Card[] {
  const cards = ATTR[sit]?.[code] ?? []
  return cards.filter((c) => c.tier === 'headline' || c.tier === 'secondary')
}

let _total = 0
let _headline = 0
Object.values(ATTR).forEach((variants) =>
  Object.values(variants).forEach((cards) =>
    cards.forEach((c) => {
      _total += 1
      if (c.tier === 'headline') _headline += 1
    })
  )
)
export const CARDS_TOTAL = _total // 693
export const CARDS_HEADLINE = _headline // 375
export const VERIFICATION = { batch: 0.952, perItem: 0.991 } // promoted_spotcheck.json via handbook

// extra question labels beyond part3's U-codes (Appendix A of the handbook)
export const Q_LABELS_FULL: Record<string, string> = {
  ...Q_LABELS,
  U12: 'apparent continent',
  W1: 'outfit color', W2: 'venue', W3: 'dancing', W4: 'food visible',
  C1: 'event kind', C2: 'decorations', C3: 'fireworks/confetti', C4: 'instruments',
  S1: 'classroom/outdoors', S2: 'uniforms', S3: 'technology', S4: 'building type',
}
export const qLabel = (c: Card) => Q_LABELS_FULL[c.question_id] ?? c.question

/* F15: blind spot caveat, must ride on any count display */
export const BLIND_SPOT =
  'Fewer cards ≠ fewer assumptions. The detector clears its consistency bar more easily on an already-collapsed stereotype than on a diffuse baseline: wedding × US and wedding × Germany surface zero headline cards because the default world needs no naming. The instrument inherits the bubble it measures.'

/* F16: attribute ↔ distance bridge */
export interface BridgeQuestion {
  status: string
  variance_explained_eta2?: number
}
export interface BridgeCell {
  centroid_distance: number
  questions: Record<string, BridgeQuestion>
}
export const BRIDGE = bridge.distance_decomposition as unknown as Record<string, Record<string, BridgeCell>>
export function bridgeFor(sit: Sit, code: Code) {
  const cellData = BRIDGE[sit]?.[code]
  if (!cellData) return null
  const rows = Object.entries(cellData.questions)
    .filter(([, v]) => v.status === 'varies' && (v.variance_explained_eta2 ?? 0) > 0)
    .map(([q, v]) => ({ q, eta2: v.variance_explained_eta2! }))
    .sort((a, b) => b.eta2 - a.eta2)
  return { distance: cellData.centroid_distance, rows }
}

/* F17: CLIP replication */
export const CLIP_DIST = clipDist.results as unknown as Record<
  Sit,
  Record<Code, { mean: number; ci_low: number; ci_high: number }>
>

