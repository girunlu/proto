// ─────────────────────────────────────────────────────────────────────────────
// Per-model data accessors for the global model switch. Kept apart from the
// provider so that file exports components only.
// ─────────────────────────────────────────────────────────────────────────────
import ui from './cultural/ui_v2.json'
import { cell, seedImg, type Sit, type Code } from './part1'
import { VQA, key, type CellVqa } from './uiv2'
import { dist as xmDist, intraset as xmIntraset, publishedSeeds } from './crossmodel'
import { type ModelId } from './modelContext'

export { ModelProvider, useModel, MODELS, MODEL_NAME, type ModelId } from './modelContext'

const XM_VQA = ui.models as unknown as Record<string, Record<string, CellVqa>>

/* ── per-model accessors; each falls back to SD 2.1's own tables ──────────── */

export const isSd21 = (m: ModelId) => m === 'sd21'

/** The seeds of the 50 that this model publishes a thumbnail for, most typical
    first. SD 2.1 publishes all 50 in its own typicality order; the six
    cross-models publish 24 chosen by the export (the 20 least alike + the 4 most
    typical). The statistics behind every number on the page have always used all
    50 seeds for every model. */
function seedOrder(m: ModelId, sit: Sit, code: Code | 'default'): number[] {
  return isSd21(m) ? cell(sit, code).typical_order : publishedSeeds(m, sit, code) ?? []
}

export const seedCount = (m: ModelId, sit: Sit = 'wedding', code: Code | 'default' = 'default') =>
  seedOrder(m, sit, code).length

export function modelImg(m: ModelId, sit: Sit, code: Code | 'default', seed: number) {
  return isSd21(m) ? seedImg(sit, code, seed) : `/images/xm/${m}_${sit}_${code}_s${seed}.webp`
}

/** seeds to show for a cell, spread across typicality */
export function modelSeeds(m: ModelId, sit: Sit, code: Code | 'default', n: number) {
  const t = seedOrder(m, sit, code)
  const k = Math.min(n, t.length)
  if (k < 2) return t.slice(0, k)
  return Array.from({ length: k }, (_, i) => t[Math.round((i * (t.length - 1)) / (k - 1))])
}

/* Superseded by src/data/crossmodel.ts, which has both rulers for all seven
   models with real bootstrap CIs. Kept as thin wrappers so nothing that still
   imports them breaks. */
export const modelDist = (m: ModelId, sit: Sit, code: Code, ruler: 'dinov3' | 'clip') =>
  xmDist(m, sit, code, ruler)

export const modelIntraset = (m: ModelId, sit: Sit, code: Code | 'default', ruler: 'dinov3' | 'clip') =>
  xmIntraset(m, sit, code, ruler)

export function modelVqa(m: ModelId, sit: Sit, code: Code | 'default'): CellVqa | null {
  if (isSd21(m)) return VQA[key(sit, code)] ?? null
  return XM_VQA[m]?.[key(sit, code)] ?? null
}

/** what a scene should say when the reader has switched away from SD 2.1 */
export const CROSS_MODEL_NOTE =
  'All seven models are read by the same single annotator (gemma4), so these answers are directly comparable model to model.'
