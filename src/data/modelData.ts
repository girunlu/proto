// ─────────────────────────────────────────────────────────────────────────────
// Per-model data accessors for the global model switch. Kept apart from the
// provider so that file exports components only.
// ─────────────────────────────────────────────────────────────────────────────
import ui from './cultural/ui_v2.json'
import { cell, seedImg, type Sit, type Code } from './part1'
import { VQA, key, type CellVqa } from './uiv2'
import { dist as xmDist, intraset as xmIntraset } from './crossmodel'
import { type ModelId } from './modelContext'

export { ModelProvider, useModel, MODELS, MODEL_NAME, type ModelId } from './modelContext'

const XM_VQA = ui.models as unknown as Record<string, Record<string, CellVqa>>

/* ── per-model accessors; each falls back to SD 2.1's own tables ──────────── */

export const isSd21 = (m: ModelId) => m === 'sd21'

/** how many seeds of this model have published thumbnails. The Tier-C export
    raised the cross-model strips from 9 to 20; the statistics behind every number
    on the page have always used all 50 seeds for every model. */
export const seedCount = (m: ModelId) => (isSd21(m) ? 50 : 20)

export function modelImg(m: ModelId, sit: Sit, code: Code | 'default', seed: number) {
  return isSd21(m) ? seedImg(sit, code, seed) : `/images/xm/${m}_${sit}_${code}_s${seed}.webp`
}

/** seeds to show for a cell, spread across typicality where we know it */
export function modelSeeds(m: ModelId, sit: Sit, code: Code | 'default', n: number) {
  if (isSd21(m)) {
    const t = cell(sit, code).typical_order
    return Array.from({ length: n }, (_, i) => t[Math.round((i * (t.length - 1)) / (n - 1))])
  }
  const total = seedCount(m)
  return Array.from({ length: Math.min(n, total) }, (_, i) => Math.round((i * (total - 1)) / (Math.min(n, total) - 1)))
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
  'Answers for the other six models come from a single annotator rather than the two used on Stable Diffusion 2.1, so compare those six freely against each other and treat comparisons against SD 2.1 as indicative.'
