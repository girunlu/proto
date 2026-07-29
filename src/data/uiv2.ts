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

/* the counter-specification ladders, all 8 pairs */
export interface EscapeLevel {
  id: string
  prompt: string
  clauses: string[]
  load: number | null
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
