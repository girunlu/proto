// ─────────────────────────────────────────────────────────────────────────────
// PART IV: THE ASSUMPTIONS, NAMED · findings F14–F17
// Sources: attribute_summary.json — gemma4 alone as of 2026-07-31 (708 cards /
//   448 headline). The two-annotator AC1-gated table it replaced reported 375
//   headline; the difference is consistency, not a gate. qwen3_vl answered the
//   same 50 images less consistently, which pushed universal assumptions (a US
//   wedding in white, in daylight) below the 0.8 bar. Verification rates 95.2%
//   batch / 99.1% per-item from ui_findings_handbook.md (promoted_spotcheck.json).
// Dropped 2026-07-31 (review B7): attribute_distance_bridge.json (328 KB) fed the
//   η² BRIDGE/bridgeFor that scene 14 replaced on 2026-07-30, and distances_clip.json
//   fed CLIP_DIST, which crossmodel.ts superseded. Both were still being bundled.
// ─────────────────────────────────────────────────────────────────────────────
import attrSummary from './cultural/attribute_summary.json'
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

/* Three counts, because they are three different things and the page used to
   print the largest one as if it were the reportable one. `CARDS_TOTAL` was
   every tier including `excluded_low_agreement` — items `cardsFor()` above
   refuses to show. That tier is empty since gemma4 became the sole annotator:
   an agreement gate needs two annotators, so the tier split is now consistency
   alone. Counted at load time, so the constants cannot drift from the file. */
let _candidates = 0
let _reported = 0
let _headline = 0
Object.values(ATTR).forEach((variants) =>
  Object.values(variants).forEach((cards) =>
    cards.forEach((c) => {
      _candidates += 1
      if (c.tier === 'headline' || c.tier === 'secondary') _reported += 1
      if (c.tier === 'headline') _headline += 1
    })
  )
)
export const CARDS_CANDIDATES = _candidates // 708 — everything the detector proposed
export const CARDS_TOTAL = _reported // 708 — all of them clear the consistency floor
export const CARDS_HEADLINE = _headline // 448 — the firm tier (consistency ≥ 0.8)
export const CARDS_EXCLUDED = _candidates - _reported // 0 — the agreement gate needed two annotators
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

