// ─────────────────────────────────────────────────────────────────────────────
// TIER C · the model switch, everywhere it was missing
// One export (scripts/phase4_frontend_export/export_tier_c.py) carrying what the
// analysis had already computed but the frontend never shipped:
//   geom        distances + intraset, 7 models × BOTH rulers, 10k-bootstrap CIs
//   lockfits    the logistic fit for every swap direction, not just the hero one
//   matrices    scene 09's 9×9 text/image matrices per model (native encoders)
//   cards       named assumptions per model (scene 14)
//   open        free-text answers per model (scene 13)
//   reality     generated-vs-photograph numbers per model (scene 15)
//   empty       the empty prompt, for the three models that were run with ""
//   dissimilar  a most-different-first seed ordering per cell
//   umap        a per-model UMAP fit per situation
//   escape_umap the counter-specification ladder as a projection
// ─────────────────────────────────────────────────────────────────────────────
import xm from './crossmodel.json'
import type { Sit, Code } from './part1'
import type { ModelId } from './modelContext'

export type Ruler = 'dinov3' | 'clip'
/* The JSON stores {m,lo,hi} to keep the file small; the scenes already speak
   {mean,ci_low,ci_high} (that is what every chart component takes), so expand
   once at load rather than touching sixty call sites. */
interface Compact { m: number; lo: number; hi: number }
export interface Trip { mean: number; ci_low: number; ci_high: number }
const expand = (c: Compact): Trip => ({ mean: c.m, ci_low: c.lo, ci_high: c.hi })

interface CrossModel {
  geom: Record<string, Record<Ruler, {
    dist: Record<string, Record<string, Compact>>
    intraset: Record<string, Record<string, Compact>>
  }>>
  lockfits: Record<string, { type: string; slope: number; step: number; ci: [number, number] }>
  matrices: Record<string, Record<string, {
    countries: string[]; txt: number[][]; img: number[][]; r: number | null; p: number | null
  }>>
  cards: Record<string, Record<string, Record<string, { q: string; v: string; cons: number; tier: string }[]>>>
  shift: Record<string, Record<string, Record<string, { distance: number; rows: ShiftRow[] }>>>
  open: Record<string, Record<string, Record<string, { v: string; n: number }[]>>>
  reality: Record<string, Record<string, Record<string, {
    gen_intra: number; gen_vendi: number; dist: number | null; n_real: number
  }>>>
  empty: Record<string, {
    fit: { rho: number; p: number; n: number } | null
    rulers: Record<Ruler, { sit: string; code: string; d_empty: number; d_default: number }[]>
  }>
  dissimilar?: Record<string, Record<string, number[]>>
  /* points arrive packed flat as [variantIndex, seed, x, y, …] — as objects this was
     800 KB of JSON punctuation for 18,000 dots. Unpacked once, below, and cached. */
  umap?: Record<string, Record<Ruler, Record<string, {
    order: string[]
    pts: number[]
    centroids: Record<string, [number, number]>
    n_per_variant: number
  }>>>
  escape_umap?: Record<string, Record<string, { levels: string[]; pts: number[] }>>
  escape?: Record<string, Record<string, XmEscapePair>>
}

const X = xm as unknown as CrossModel

/* ── geometry: the one call every distance chart now makes ─────────────────── */

type Table = Record<string, Record<string, Trip>>
const GEOM: Record<string, Record<Ruler, { dist: Table; intraset: Table }>> = Object.fromEntries(
  Object.entries(X.geom).map(([model, byRuler]) => [
    model,
    Object.fromEntries(
      Object.entries(byRuler).map(([ruler, t]) => [
        ruler,
        {
          dist: Object.fromEntries(
            Object.entries(t.dist).map(([sit, row]) => [
              sit,
              Object.fromEntries(Object.entries(row).map(([c, v]) => [c, expand(v)])),
            ])
          ),
          intraset: Object.fromEntries(
            Object.entries(t.intraset).map(([sit, row]) => [
              sit,
              Object.fromEntries(Object.entries(row).map(([c, v]) => [c, expand(v)])),
            ])
          ),
        },
      ])
    ),
  ])
) as never

export const dist = (m: ModelId, sit: Sit, code: Code, ruler: Ruler): Trip =>
  GEOM[m][ruler].dist[sit][code]

export const distOrNull = (m: ModelId, sit: Sit, code: Code | 'default', ruler: Ruler): Trip | null =>
  code === 'default' ? null : dist(m, sit, code, ruler)

export const intraset = (m: ModelId, sit: Sit, code: Code | 'default', ruler: Ruler): Trip =>
  GEOM[m][ruler].intraset[sit][code]

/* CLIP similarities sit higher on the scale than DINOv3 ones, so a chart that can
   switch ruler has to switch its axis maximum too or the bars all saturate. */
export const RULER_MAX: Record<Ruler, { dist: number; intraset: number }> = {
  dinov3: { dist: 0.7, intraset: 0.9 },
  clip: { dist: 0.45, intraset: 1 },
}

export const RULER_NAME: Record<Ruler, string> = { dinov3: 'DINOv3', clip: 'CLIP' }

/* ── scene 06: the fit for every direction ────────────────────────────────── */

export const lockFit = (direction: string) => X.lockfits[direction] ?? null
/* p(the swap still wins) at step k, from that direction's own fitted parameters */
export const fitCurve = (direction: string, k: number) => {
  const f = X.lockfits[direction]
  return f ? 1 / (1 + Math.exp(f.slope * (k - f.step))) : null
}

/* ── scene 09 ─────────────────────────────────────────────────────────────── */

export const matrix = (m: ModelId, sit: Sit) => X.matrices[m]?.[sit] ?? null

/* ── scenes 13/14 ─────────────────────────────────────────────────────────── */

export const cardsForModel = (m: ModelId, sit: Sit, code: Code | 'default') =>
  X.cards[m]?.[sit]?.[code] ?? null

export const openForModel = (m: ModelId, sit: Sit, code: Code | 'default') =>
  X.open[m]?.[`${sit}_${code}`] ?? null

/* ── scene 14: what actually moved, plain prompt → country prompt ──────────── */

/** One question's contribution to the plain→country movement.
 *  `share`  fraction of the movement this attribute's answers CHANGING accounts for.
 *  `plain`  its majority answer for the plain prompt, `value` for the country one —
 *           carried so the scene can show that many attributes did not move at all.
 *  `sep`    the answers barely overlap between the two cells, so the share is forced
 *           toward 1: true but tautological (apparent continent on a Nigerian prompt).
 *
 *  This replaces the η² rows the scene used to draw. η² was a within-cell variance
 *  measure that never compared the two cells' answers, so an attribute with the same
 *  answer in both could score high off two stray seeds. */
export interface ShiftRow { q: string; share: number; plain: string; value: string; sep: boolean }
export const shiftFor = (m: ModelId, sit: Sit, code: Code) => X.shift[m]?.[sit]?.[code] ?? null

/* ── scene 15 ─────────────────────────────────────────────────────────────── */

export const realityFor = (m: ModelId, sit: Sit, code: Code) => X.reality[m]?.[sit]?.[code] ?? null

/* ── scene 03: the empty prompt, where it was run ─────────────────────────── */

export const EMPTY_MODELS = Object.keys(X.empty) as ModelId[]
/** the empty-prompt scatter for one model under one ruler, or null if that model
    was never generated with prompt="". `fit` is that model's own Spearman ρ for
    "far from the plain prompt = far from the empty prompt" — SD 2.1's 0.75 does
    not replicate, so the scene reads this rather than asserting the diagonal. */
export const emptyFor = (m: ModelId, ruler: Ruler) => {
  const e = X.empty[m]
  return e?.rulers?.[ruler] ? { fit: e.fit, rows: e.rulers[ruler] } : null
}
export const emptyImg = (m: ModelId, i: number) =>
  m === 'sd21'
    ? `/images/zero/ep_${String(i).padStart(2, '0')}.webp`
    : `/images/zero/${m}_ep_${String(i).padStart(2, '0')}.webp`

/* ── mosaics: most-different-first ─────────────────────────────────────────── */

/** seeds ordered most-different-first (greedy farthest-point in DINOv3 space) */
export const dissimilarSeeds = (m: ModelId, sit: Sit, code: Code | 'default', n: number): number[] | null => {
  const all = X.dissimilar?.[m]?.[`${sit}_${code}`]
  return all ? all.slice(0, n) : null
}

/* ── scene 05 / scene 16: projections ─────────────────────────────────────── */

export interface UmapPoint { c: string; s: number; xy: [number, number] }
export interface UmapFit {
  points: UmapPoint[]
  centroids: Record<string, [number, number]>
  n_per_variant: number
}

const unpack = new Map<string, UmapFit | null>()

export function umapFor(m: ModelId, sit: Sit, ruler: Ruler): UmapFit | null {
  const cacheKey = `${m}|${ruler}|${sit}`
  if (unpack.has(cacheKey)) return unpack.get(cacheKey)!
  const raw = X.umap?.[m]?.[ruler]?.[sit]
  let out: UmapFit | null = null
  if (raw) {
    const points: UmapPoint[] = []
    for (let i = 0; i < raw.pts.length; i += 4) {
      points.push({ c: raw.order[raw.pts[i]], s: raw.pts[i + 1], xy: [raw.pts[i + 2], raw.pts[i + 3]] })
    }
    out = { points, centroids: raw.centroids, n_per_variant: raw.n_per_variant }
  }
  unpack.set(cacheKey, out)
  return out
}
export interface LadderFit { levels: string[]; points: { l: string; s: number; xy: [number, number] }[] }
const ladders = new Map<string, LadderFit | null>()

export function escapeUmap(m: ModelId, pair: string): LadderFit | null {
  const key = `${m}|${pair}`
  if (ladders.has(key)) return ladders.get(key)!
  const raw = X.escape_umap?.[m]?.[pair]
  let out: LadderFit | null = null
  if (raw) {
    const points: LadderFit['points'] = []
    for (let i = 0; i < raw.pts.length; i += 4) {
      points.push({ l: raw.levels[raw.pts[i]], s: raw.pts[i + 1], xy: [raw.pts[i + 2], raw.pts[i + 3]] })
    }
    out = { levels: raw.levels, points }
  }
  ladders.set(key, out)
  return out
}
export const hasUmap = (m: ModelId) => X.umap?.[m] != null

/* ── scene 16: the counter-specification ladder, per model ─────────────────── */

/** Same shape as ui_v2.json's `escape` block, minus the plain-prompt rung and the
    neutral-qualifier controls: cross-model, the ladder was only built for the two
    Nigeria hero pairs, and only from L0 upward. `moved` is how far that rung's set
    sits from this model's own country-qualified prompt. */
export interface XmEscapePair {
  situation: string
  code: string
  levels: { id: string; prompt: string; clauses: string[]; load: number | null; intraset: number | null; moved?: number | null; distance: number | null }[]
  switches: Record<string, { q: string; before: string; before_share: number; after: string; after_share: number; flipped: boolean }[]>
  /** the qids the clauses at each rung asked for — excluded from `switches`, so
      everything listed there moved without being asked */
  targeted?: Record<string, string[]>
  default_intraset: number | null
  final_load_delta: number
}
export const LADDER_MODELS = ['sd21', ...Object.keys(X.escape ?? {})] as ModelId[]
export const escapePairsFor = (m: ModelId) => X.escape?.[m] ?? null
/** the ladder rung images live under a per-model prefix; SD 2.1 keeps the old names */
export const xmEscapeImg = (m: ModelId, pair: string, level: string, seed: number) =>
  m === 'sd21'
    ? `/images/escape/${pair}_${level}_s${String(seed).padStart(2, '0')}.webp`
    : `/images/escape/${m}_${pair}_${level}_s${String(seed).padStart(2, '0')}.webp`

/** each model's own Vendi score ("effectively distinct pictures of 50"), including
    for the plain prompt — scene 11 used to borrow SD 2.1's for that one column */
export const vendiFor = (m: ModelId, sit: Sit, code: Code | 'default') =>
  X.reality[m]?.[sit]?.[code]?.gen_vendi ?? null
