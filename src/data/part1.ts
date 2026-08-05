// ─────────────────────────────────────────────────────────────────────────────
// PART I: THE DEFAULT · findings F1–F5
// Data sources: src/data/cultural/chunk1.json (per-cell dist/intraset/typical_order,
// f3 per-seed nearest-country labels, empty_prior), src/data/cultural/umap.json
// (real UMAP export, 30 points per variant + true centroids).
// F5 silhouette range 0.10–0.27 from master_docs/findings_summary.md (clip-matrix
// statistics). F3 headline 16/300 = 5.3% computed from chunk1.f3 (below).
// ─────────────────────────────────────────────────────────────────────────────
import chunk1 from './cultural/chunk1.json'
import umap from './cultural/umap.json'
import { VQA, Q_TEXT } from './uiv2'

export type Sit = 'wedding' | 'funeral' | 'celebration' | 'family' | 'breakfast' | 'school'
export type Code = 'US' | 'DE' | 'RU' | 'ID' | 'JP' | 'EG' | 'IN' | 'NG'

export const SITS = chunk1.situations as Sit[]
export const CODES = chunk1.codes as Code[]

// WEIRD → far order, matching the project's validated categorical palette
export const COUNTRY8: { id: Code; name: string; cv: string }[] = [
  { id: 'US', name: 'United States', cv: '--c-us' },
  { id: 'DE', name: 'Germany', cv: '--c-de' },
  { id: 'RU', name: 'Russia', cv: '--c-ru' },
  { id: 'ID', name: 'Indonesia', cv: '--c-id' },
  { id: 'JP', name: 'Japan', cv: '--c-jp' },
  { id: 'EG', name: 'Egypt', cv: '--c-eg' },
  { id: 'IN', name: 'India', cv: '--c-in' },
  { id: 'NG', name: 'Nigeria', cv: '--c-ng' },
]
/* Adjectival forms. Deriving them as `${name}n` printed "Germanyn", "Japann"
   and "Egyptn" — it only happened to work for India/Russia/Indonesia/Nigeria. */
export const DEMONYM: Record<Code, string> = {
  US: 'American', DE: 'German', RU: 'Russian', ID: 'Indonesian',
  JP: 'Japanese', EG: 'Egyptian', IN: 'Indian', NG: 'Nigerian',
}

export const CV_DEFAULT = '--c-gray'
export const C8 = Object.fromEntries(COUNTRY8.map((c) => [c.id, c])) as Record<Code, (typeof COUNTRY8)[number]>

// UMAP export uses full lowercase country names
export const UMAP_NAME_TO_CODE: Record<string, Code | 'default'> = {
  default: 'default', usa: 'US', germany: 'DE', russia: 'RU', indonesia: 'ID',
  japan: 'JP', egypt: 'EG', india: 'IN', nigeria: 'NG',
}

export interface Cell {
  dist: { country: string; mean: number; ci_low: number; ci_high: number } | null
  intraset: { mean: number; ci_low: number; ci_high: number; n_seeds: number }
  diverse9: number[]
  headline_n: number
  secondary_n: number
  top_cards: { id: string; q: string; v: string; p: number }[]
  typical_order: number[]
  subclusters: { k: number; citable: boolean; ari: number }
}
export const CELLS = chunk1.cells as unknown as Record<string, Cell>
export const cellKey = (sit: Sit, code: Code | 'default') => `${sit}_${code}`
export const cell = (sit: Sit, code: Code | 'default'): Cell => CELLS[cellKey(sit, code)]

// F3: per-seed nearest-country label for each default seed, per situation
export const F3 = chunk1.f3 as unknown as Record<Sit, Code[]>
// F3 headline: seeds landing nearest the Global-South countries (IN/NG/ID/EG).
// 16/300 = 0.053, matching ui_findings_handbook.md F3 ("non-Western share = 0.053").
export const SOUTH: Code[] = ['IN', 'NG', 'ID', 'EG']
export const F3_SOUTH_COUNT = SITS.reduce(
  (acc, s) => acc + F3[s].filter((l) => SOUTH.includes(l)).length,
  0
)
export const F3_TOTAL = SITS.reduce((acc, s) => acc + F3[s].length, 0)

// F2: empty-prompt distances (30 images, prompt = "")
export const EMPTY = chunk1.empty_prior as unknown as {
  mean_by_country: Record<Code | 'default', number>
}

// F4: real UMAP export
export interface UmapPoint { country: string; seed: number; x: number; y: number }
export const UMAP = umap.results as unknown as Record<
  Sit,
  { points: UmapPoint[]; centroids: Record<string, { x: number; y: number }>; clusters: [number, number][][] }
>

// F5: silhouette range across situations (findings_summary.md: "0.10–0.27")
export const SILHOUETTE_RANGE: [number, number] = [0.1, 0.27]

// Scene 01 ("the unsaid"): what the plain wedding prompt leaves to the model, and
// what the model supplies — from the wedding-default VQA battery (gemma4, 50 seeds). Kept in the data layer so the chips can't silently drift from the stats.
/* scene 01: derived from the blind-VQA export at load time, so the chips can
   never drift from the data again (they had: the hand-typed version said dress
   colour 46/50 and wealth "average"; the export says 44/45 and "wealthy").
   Top 8 closed questions by agreement, for whichever event is selected. */
export interface Decision { attr: string; answer: string; stat: string; share: number }

/** Scene 01's "what the model decided anyway" list. `closed` comes from whichever
    model is selected — the cross-model VQA is exported for all seven, so this scene
    follows the switcher instead of silently staying on SD 2.1 while the prose said
    "Stable Diffusion". Callers pass `modelVqa(model, sit, 'default')?.closed`. */
export const decisionsFrom = (closed: Record<string, { v: string; n: number }[]>): Decision[] =>
  Object.entries(closed ?? {})
    .map(([q, answers]) => {
      const total = answers.reduce((s, a) => s + a.n, 0)
      return {
        attr: Q_TEXT[q] ?? q,
        answer: answers[0].v,
        stat: `${answers[0].n} of ${total} images, judged blind`,
        share: total ? answers[0].n / total : 0,
      }
    })
    .sort((a, b) => b.share - a.share)
    .slice(0, 8)

/** SD 2.1's own list, kept for callers that have no model in scope. */
export const decisionsFor = (sit: Sit): Decision[] =>
  decisionsFrom(VQA[`${sit}_default`]?.closed ?? {})

// image helpers
export const seedImg = (sit: Sit, code: Code | 'default', seed: number) =>
  `/images/seeds/${sit}_${code}_s${String(seed).padStart(2, '0')}.webp`
export const ZERO_IMGS = Array.from({ length: 30 }, (_, i) => `/images/zero/ep_${String(i).padStart(2, '0')}.webp`)

// yardstick calibration (ui_findings_handbook.md: required on every distance chart)
export const YARDSTICK = {
  emptyPrior: 0.26, // distance of the empty prompt itself from a situation default
  ceiling: [0.7, 0.9] as [number, number], // distance between two different situations
  note: '0.5 ≈ most of the way to being a different event',
}
