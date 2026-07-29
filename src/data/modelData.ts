// ─────────────────────────────────────────────────────────────────────────────
// Per-model data accessors for the global model switch. Kept apart from the
// provider so that file exports components only.
// ─────────────────────────────────────────────────────────────────────────────
import ui from './cultural/ui_v2.json'
import branchA from './branchA.json'
import { cell, seedImg, type Sit, type Code } from './part1'
import { VQA, INTRASET_CLIP, key, type CellVqa } from './uiv2'
import { type ModelId } from './modelContext'

export { ModelProvider, useModel, MODELS, MODEL_NAME, type ModelId } from './modelContext'

const XM_VQA = ui.models as unknown as Record<string, Record<string, CellVqa>>

/* ── per-model accessors; each falls back to SD 2.1's own tables ──────────── */

export const isSd21 = (m: ModelId) => m === 'sd21'

/** how many seeds of this model are on the page (SD 2.1 has the full run) */
export const seedCount = (m: ModelId) => (isSd21(m) ? 50 : 9)

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

export function modelDist(m: ModelId, sit: Sit, code: Code, ruler: 'dinov3' | 'clip') {
  if (isSd21(m) && ruler === 'dinov3') return cell(sit, code).dist!
  if (isSd21(m)) return null // CLIP tables exist for SD 2.1 only; caller falls back
  const d = (branchA.data as Record<string, { distances: Record<string, Record<string, { mean: number; lo: number; hi: number }>> }>)[m]
    ?.distances?.[sit]?.[code]
  return d ? { mean: d.mean, ci_low: d.lo, ci_high: d.hi } : null
}

export function modelIntraset(m: ModelId, sit: Sit, code: Code | 'default', ruler: 'dinov3' | 'clip') {
  if (isSd21(m)) return ruler === 'dinov3' ? cell(sit, code).intraset : INTRASET_CLIP[key(sit, code)]
  const v = (branchA.data as Record<string, { intraset: Record<string, Record<string, number>> }>)[m]
    ?.intraset?.[sit]?.[code]
  return v == null ? null : { mean: v, ci_low: v, ci_high: v }
}

export function modelVqa(m: ModelId, sit: Sit, code: Code | 'default'): CellVqa | null {
  if (isSd21(m)) return VQA[key(sit, code)] ?? null
  return XM_VQA[m]?.[key(sit, code)] ?? null
}

/** what a scene should say when the reader has switched away from SD 2.1 */
export const CROSS_MODEL_NOTE =
  'Answers for the other six models come from a single annotator rather than the two used on Stable Diffusion 2.1, so compare those six freely against each other and treat comparisons against SD 2.1 as indicative.'
