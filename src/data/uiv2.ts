// ─────────────────────────────────────────────────────────────────────────────
// Second-pass exports built for the revised scenes (2026-07-29 design feedback).
// Source: scripts/phase4_frontend_export/export_ui_v2.py → cultural/ui_v2.json
// ─────────────────────────────────────────────────────────────────────────────
import ui from './cultural/ui_v2.json'
import credits from './cultural/reality_credits.json'
import type { Sit, Code } from './part1'

export type CellKey = string // `${sit}_${code}`

/* viz 03: every cell as (distance from the empty prompt, distance from its default) */
export interface Empty2D {
  sit: Sit
  code: Code | 'default'
  d_empty: number
  d_empty_lo: number
  d_empty_hi: number
  d_default: number
}
export const EMPTY_2D = ui.empty2d as unknown as Empty2D[]

/* per-cell hardening: k-NN separability + permutation p-values */
export interface Hardening {
  knn_auc: number
  p_dist: number
  p_intraset: number
  null_p95: number
}
export const HARDENING = ui.hardening as unknown as Record<CellKey, Hardening>

/* the same within-set similarity, recomputed with CLIP instead of DINOv3 */
export const INTRASET_CLIP = ui.intraset_clip as unknown as Record<
  CellKey, { mean: number; ci_low: number; ci_high: number }
>

/* Vendi score = effective number of distinct images inside a 50-seed set */
export const VENDI_CELL = ui.vendi as unknown as Record<CellKey, number>

/* the blind VQA battery, as answer distributions rather than cards */
export interface Answer { v: string; n: number }
export interface CellVqa {
  closed: Record<string, Answer[]>
  open: Record<string, Answer[]>
}
export const VQA = ui.vqa as unknown as Record<CellKey, CellVqa>

/* B4: scene 13 claimed "15 questions put to every image … 38 distinct questions
   across the study". The exported battery has 37 distinct, 13 asked in every cell,
   and 17–18 per cell (gemma4 answers two universal questions that qwen3_vl left
   blank often enough to be dropped; the annotator switch on 2026-07-31 raised
   both figures). Derived here so the sentence cannot drift from the export
   again. U12 (apparent continent) joined the battery on 2026-08-03; it had been
   withheld since the first export. The "a wedding → Europe 80%" card that was the
   argument for surfacing it was qwen3_vl's, and qwen3_vl was retired on 2026-07-31 —
   under gemma4 the plain prompt has no nameable continent at all. See U12_CONTINENT. */
/* U12 asks "which continent does this appear to be", and the answer is the page's own
   thesis showing up inside the instrument: name a non-Western country and the annotator
   names a continent; name a Western one, or none at all, and it mostly returns "unclear".
   Derived here because it is quoted in scene 13's prose. Reported only — U12 is kept out
   of the steerability law, where a country-named prompt would make it circular. */
const WEST = new Set(['US', 'DE', 'RU'])
export const U12_CONTINENT = (() => {
  const top = (k: string) => VQA[k as CellKey]?.closed?.U12?.[0]?.v
  const keys = Object.keys(VQA)
  const plain = keys.filter((k) => k.endsWith('_default'))
  const country = keys.filter((k) => !k.endsWith('_default'))
  const west = country.filter((k) => WEST.has(k.split('_')[1]))
  const rest = country.filter((k) => !WEST.has(k.split('_')[1]))
  return {
    plainUnclear: plain.filter((k) => top(k) === 'unclear').length,
    plainN: plain.length,
    restNamed: rest.filter((k) => top(k) !== 'unclear').length,
    restN: rest.length,
    westUnclear: west.filter((k) => top(k) === 'unclear').length,
    westN: west.length,
  }
})()

export const BATTERY = (() => {
  const cells = Object.values(VQA).map(
    (d) => new Set([...Object.keys(d.closed ?? {}), ...Object.keys((d as { open?: object }).open ?? {})])
  )
  const distinct = new Set(cells.flatMap((s) => [...s]))
  const universal = [...distinct].filter((q) => cells.every((s) => s.has(q)))
  const sizes = cells.map((s) => s.size)
  return {
    distinct: distinct.size,
    universal: universal.length,
    perCellMin: Math.min(...sizes),
    perCellMax: Math.max(...sizes),
  }
})()

/* the counter-specification ladders, all 8 pairs */
export interface EscapeLevel {
  id: string
  prompt: string
  clauses: string[]
  load: number | null
  /* the denominator `load` is counted against: attributes still unspecified at this
     rung. `load` only counts assumptions the prompt did NOT request, so every clause
     deletes its own target from the pool — at depth 8 that is most of the movement. */
  pool: number | null
  intraset: number | null
  distance: number | null
  control?: boolean
}
export interface EscapeSwitch {
  q: string
  before: string
  before_share: number
  after: string
  after_share: number
  flipped: boolean
}
export interface EscapePair {
  situation: Sit
  code: Code
  levels: EscapeLevel[]
  switches: Record<string, EscapeSwitch[]>
  default_intraset: number | null
}
export const ESCAPE_PAIRS = ui.escape as unknown as Record<string, EscapePair>

/* viz 17: generated majority vs real-photo majority, per attribute, all 48 cells */
export interface RealityRow {
  q: string
  gen: string
  gen_share: number
  real: string
  real_share: number
  n_real: number
  contradicts: boolean
}
export const REALITY_ATTRS = ui.reality_attrs as unknown as Record<CellKey, RealityRow[]>

/* cross-attention maps, now per seed */
export const DAAM_INDEX = ui.daam_index as unknown as Record<CellKey, { tokens: string[]; n_seeds: number }>
export const daamImg = (sit: Sit, code: Code | 'default', seed: number, token: string) =>
  `/images/daam/${sit}_${code}_s${String(seed).padStart(2, '0')}_${token}.webp`

/* A·3: one image per model, each that model's least typical seed for the cell,
   alongside the assumptions that fire in every model */
export interface XmCell {
  picks: { model: string; seed: number }[]
  mean_cross_model_distance: number
  shared: { q: string; v: string; text: string; n: number }[]
}
export const XM = ui.xm as unknown as Record<CellKey, XmCell>

/* real Commons photos, all 48 cells */
export interface Credit { file: string; author: string; license: string; url: string }
export const REAL_CREDITS = credits as unknown as Record<string, Credit[]>

export const key = (sit: Sit, code: Code | 'default'): CellKey => `${sit}_${code}`

/* image helpers for the newly exported sets */
export const swapImgSeed = (direction: string, step: number, seed: number) =>
  `/images/swaps/${direction}_step_${String(step).padStart(2, '0')}_s${String(seed).padStart(2, '0')}.webp`
export const escapeImg = (pair: string, level: string, seed: number) =>
  `/images/escape/${pair}_${level}_s${String(seed).padStart(2, '0')}.webp`
export const controlImg = (pair: string, ctrl: string, seed: number) =>
  `/images/controls/${pair}_${ctrl}_s${String(seed).padStart(2, '0')}.webp`
export const realImg = (file: string) => `/images/reality/${file}`
export const cfgImgCell = (sit: Sit, code: Code | 'default', cfg: number) =>
  `/images/cfg/${sit}_${code}_cfg${cfg}.webp`
export const xmImgPath = (model: string, sit: Sit, code: Code | 'default', seed: number) =>
  model === 'sd21'
    ? `/images/seeds/${sit}_${code}_s${String(seed).padStart(2, '0')}.webp`
    : `/images/xm/${model}_${sit}_${code}_s${seed}.webp`

/* plain-English labels for the whole frozen battery (Appendix A) */
/* ── the forced-choice control ────────────────────────────────────────────────
   A SECOND instrument, deliberately in its own key. `VQA` above is the frozen
   battery, where "unclear" is a legal answer. This is the same images and the same
   questions with that option deleted, so it answers one question only: when the
   model may not abstain, does it land in the same place?

   It must never be presented as a correction to the battery. Deleting an abstention
   cannot fail to raise agreement, so a reader who reads these numbers as "the real
   ones" is reading an inflated instrument. Scene 13 shows them side by side. */
export interface ForcedQ {
  n: number            // answers re-asked for this cell+question
  refused: number      // declined AGAIN, including off-list replies like "n-a"
  was?: string         // what the frozen battery's majority had been
  top: Answer[]
}
export interface ForcedGroup {
  n_forced: number
  refused_again: number
  refused_share: number
  named_a_continent: number
  europe_or_north_america: number
  west_share_of_named: number | null
}
const _forced = (ui.forced ?? {}) as unknown as {
  cells?: Record<string, Record<string, ForcedQ>>
  u12?: Record<string, ForcedGroup>
  total?: number
}
export const FORCED_CELLS = _forced.cells ?? {}
export const FORCED_U12 = _forced.u12 ?? {}
export const FORCED_TOTAL = _forced.total ?? 0
/** the forced result for one cell+question, or null where nothing was re-asked */
export const forcedFor = (cellKey: string, q: string): ForcedQ | null =>
  FORCED_CELLS[cellKey]?.[q] ?? null

/* ── open-answer hygiene ──────────────────────────────────────────────────────
   The free-text answers were clustered per cell, so every cell invented its own
   wording for the same idea and the UI showed them as separate findings. Two
   problems, fixed here rather than in the export so nothing has to be regenerated:

   1. NON-ANSWERS. Twelve U05 labels are variants of "the annotator said nothing"
      ("No description provided (n-a)", "Not Applicable / Not Visible", …) — 363
      images, and six of them ranked in that question's top answers. Missing data
      presented as a finding is worse than no finding, so they are dropped.
   2. NEAR-DUPLICATES. "Buildings/Structures" and "Buildings and Structures";
      "Traditional Japanese Attire (Kimono/Yukata/Robes)" and "…(Kimono/Yukata/
      Hakama)". Merged by a DELIBERATELY CONSERVATIVE key — parentheticals and
      filler words dropped, then only EXACT matches merge. It collapses 651 labels
      to 589 and leaves genuinely different wordings alone; over-merging distinct
      concepts would be a worse error than leaving a duplicate visible. */
const NO_ANSWER =
  /\b(n-?a|not applicable|no answer|no description|no discernible|not visible|unavailable|no information|none provided|empty)\b/i

const FILLER =
  /\b(general|generic|focus|elements|related|various|overall|predominantly|mainly|primarily|specific|items|mentions|responses|indicating|the|a|an|and|or|of|with|in|to)\b/g

const canonicalKey = (v: string) =>
  v.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ')
    .replace(FILLER, ' ').replace(/s\b/g, '').replace(/\s+/g, ' ').trim()

/** Drop non-answers, merge near-duplicate clusters, re-sort by size. */
export function tidyOpen(answers: Answer[]): Answer[] {
  const buckets = new Map<string, { v: string; n: number }>()
  for (const a of answers) {
    if (NO_ANSWER.test(a.v)) continue
    const k = canonicalKey(a.v)
    if (!k) continue
    const hit = buckets.get(k)
    // keep the wording of the largest member as the label for the merged bucket
    if (hit) { hit.n += a.n; if (a.n > hit.n - a.n) hit.v = a.v }
    else buckets.set(k, { v: a.v, n: a.n })
  }
  return [...buckets.values()].sort((x, y) => y.n - x.n)
}

export const Q_TEXT: Record<string, string> = {
  U01: 'indoors or outdoors', U02: 'urban or rural', U03: 'are there people',
  U04: 'how many people', U05: 'describe the clothing', U05b: 'clothing traditional or modern',
  U06: 'anyone wearing headwear', U07: 'building type', U08: 'modern or historical',
  U09: 'day or night', U10: 'weather', U11: 'wealthy, average or poor',
  U12: 'which continent it looks like', U13: 'visible objects', U14: 'the setting, in one sentence',
  W1: 'ceremonial outfit colour', W2: 'ceremony venue', W3: 'are people dancing', W4: 'is food visible',
  B1: 'what food is visible', B2: 'food at a table, floor or counter', B3: 'what drink is visible',
  B4: 'how many place settings',
  C1: 'what kind of event', C2: 'decorations visible', C3: 'fireworks or confetti', C4: 'instruments visible',
  FA1: 'how many people', FA2: 'multiple generations', FA3: 'the setting',
  F1: 'dominant clothing colour', F2: 'coffin visible', F3: 'indoors, graveside or procession',
  F4: 'flowers visible',
  S1: 'classroom or outdoors', S2: 'uniforms worn', S3: 'technology visible', S4: 'building type',
}

/* the coarse families the per-attribute weights get grouped into (viz 15) */
export const Q_FAMILY: Record<string, string> = {
  U01: 'where it happens', U02: 'where it happens', U07: 'where it happens',
  W2: 'where it happens', FA3: 'where it happens', S1: 'where it happens', S4: 'where it happens',
  U03: 'who is there', U04: 'who is there', FA1: 'who is there', FA2: 'who is there',
  U05: 'what people wear', U05b: 'what people wear', U06: 'what people wear',
  W1: 'what people wear', F1: 'what people wear', S2: 'what people wear',
  U08: 'when it looks like', U09: 'when it looks like', U10: 'when it looks like',
  U11: 'how well-off it looks', U12: 'where in the world it looks like',
  U13: 'what objects appear', W3: 'what objects appear', W4: 'what objects appear',
  B1: 'what objects appear', B2: 'what objects appear', B3: 'what objects appear',
  B4: 'what objects appear', C2: 'what objects appear', C3: 'what objects appear',
  C4: 'what objects appear', F2: 'what objects appear', F4: 'what objects appear',
  S3: 'what objects appear', C1: 'what kind of event', U14: 'the scene overall',
}
export const FAMILY_EXAMPLE: Record<string, string> = {
  'where it happens': 'indoors or outdoors · urban or rural · church, hall, hut',
  'who is there': 'how many people · whether generations mix',
  'what people wear': 'traditional or modern · headwear · outfit colour',
  'when it looks like': 'modern or historical · day or night · the weather',
  'how well-off it looks': 'wealthy, average or poor',
  'where in the world it looks like': 'the continent an annotator would guess',
  'what objects appear': 'food, flowers, instruments, confetti, technology',
  'what kind of event': 'a festival, a rally, a family party',
  'the scene overall': 'the one-sentence description of the whole picture',
}
