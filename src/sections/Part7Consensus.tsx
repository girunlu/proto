import { useState } from 'react'
import { motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote, InfoBox } from '../components/Scene'

import { rgb, rgba } from '../lib/colors'
import { Q_TEXT } from '../data/uiv2'
import { useModel, MODEL_NAME, MODELS, type ModelId } from '../data/modelContext'
import { CONSENSUS as C, PREVALENCE as P, firingCells, isAssumption } from '../data/remedy'
import { modelImg, modelSeeds } from '../data/modelData'
import { C8, type Sit, type Code } from '../data/part1'

const short = (m: string) => MODEL_NAME[m as ModelId]?.replace('Stable Diffusion', 'SD') ?? m

/* cell keys are `${sit}_${code}`; no situation contains an underscore, so the last
   one is the separator */
function splitCell(key: string): { sit: Sit; code: Code | 'default' } {
  const i = key.lastIndexOf('_')
  return { sit: key.slice(0, i) as Sit, code: key.slice(i + 1) as Code | 'default' }
}
const promptOf = (key: string) => {
  const { sit, code } = splitCell(key)
  return code === 'default' ? `a ${sit}` : `a ${sit} in ${C8[code as Code].name}`
}

/* ── the evidence behind one matrix cell ───────────────────────────────────────
   The matrix ships counts, and a count is exactly the kind of number this page
   refuses to let stand on its own: "flux assumes it is daytime in 41 of 54
   prompts" is a claim about pictures, so the pictures have to be reachable. The
   firing prompts come from the debt block at the headline gate, which is the same
   record the count was made from — see firingCells for the one case (attributes
   the prompt itself entails) where the count exists and the list cannot.

   Rendered in the page's existing preview position — fixed, bottom right, pointer
   transparent — so it behaves like every other hover preview here rather than
   inventing a second idiom for the same gesture. */
type Pick = { m: ModelId; q: string; v: string; n: number }

/* ── the shading ──────────────────────────────────────────────────────────────
   The first version scaled alpha linearly on 0…54, which is the wrong range: no
   cell is ever 0 (blank means "outside this model's top twenty"), the observed
   floor is 7, and the counts are heavily skewed — 90% sit under 27 while the
   scale reserved half its ink for 27…54. A cell of 24, well into the top decile,
   came out at 0.35 alpha and read as nothing.
   The ramp now spans the observed range and is square-rooted, so the crowded low
   end gets the spread it needs. The number is printed in every cell regardless —
   the colour is the secondary encoding here, which is what makes a perceptual
   ramp legitimate rather than a distortion. Legend below the table, with the
   median ticked, since a non-linear ramp has to show its own scale. */
/* prompt-entailed and abstention rows are dropped before anything is measured off
   the matrix, so the ramp is scaled to what the table actually shows */
const MATRIX = P.matrix.filter((r) => isAssumption(r.q, r.v))
const COUNTS = MATRIX.flatMap((r) => Object.values(r.by_model).filter((n) => n > 0)).sort((a, b) => a - b)
const N_LO = COUNTS[0]
const N_HI = COUNTS[COUNTS.length - 1]
const N_MED = COUNTS[Math.floor(COUNTS.length / 2)]
const alphaFor = (n: number) =>
  n <= 0 ? 0 : 0.14 + 0.78 * Math.sqrt(Math.max(0, n - N_LO) / (N_HI - N_LO))

/* Images are drawn breadth-first across the firing prompts: one from each before a
   second from any, so a 1-image preview is one prompt rather than one seed of one
   prompt, and 2×2 is four different prompts wherever the count allows. */
function sample(m: ModelId, cells: string[], want: number) {
  // no cells => per is Infinity and the loop below never terminates
  if (!cells.length) return []
  const per = Math.ceil(want / cells.length)
  const cols = cells.map((key) => {
    const { sit, code } = splitCell(key)
    return modelSeeds(m, sit, code, per).map((s) => ({ key, sit, code, s }))
  })
  const out: { key: string; sit: Sit; code: Code | 'default'; s: number }[] = []
  for (let i = 0; i < per && out.length < want; i++) {
    for (const col of cols) {
      if (col[i] && out.length < want) out.push(col[i])
    }
  }
  return out
}

function EvidencePreview({ pick, want }: { pick: Pick; want: number }) {
  const { m, q, v, n } = pick
  const { cells, held } = firingCells(m, q, v)
  const shots = sample(m, cells, want)
  const cols = want === 1 ? 1 : 2

  return (
    <div className="pointer-events-none fixed right-6 bottom-6 z-50 w-[300px] rounded-xl border border-amber-300/40 bg-background/95 p-2.5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur">
      <div className="font-mono2 text-[10px] leading-4 text-foreground/60">
        <span className="text-amber-200">{short(m)}</span> · {Q_TEXT[q] ?? q}{' '}
        <span className="text-emerald-300">{v}</span>
      </div>
      <div className={`mt-2 grid gap-0.5 ${cols === 1 ? '' : 'grid-cols-2'}`}>
        {shots.map((sh) => (
          <img
            key={`${sh.key}_${sh.s}`}
            src={modelImg(m, sh.sit, sh.code, sh.s)}
            alt=""
            loading="lazy"
            className="w-full rounded-sm"
          />
        ))}
      </div>
      <div className="mt-2 font-mono2 text-[9px] leading-3.5 text-foreground/45">
        fires in {n} of {P.n_cells} prompts · showing{' '}
        {shots.length === 1 ? '1' : `${new Set(shots.map((s) => s.key)).size} of them`}
        <div className="mt-1 text-foreground/30">
          {cells.slice(0, 6).map(promptOf).join(' · ')}
          {cells.length > 6 ? ` · +${cells.length - 6} more` : ''}
        </div>
        {held > 0 && (
          <div className="mt-1 text-foreground/30">
            {held} more {held === 1 ? 'prompt is' : 'prompts are'} counted but not shown: nobody is in the picture, so
            it says nothing about what people wear.
          </div>
        )}
      </div>
    </div>
  )
}

export default function Part7Consensus() {
  const { model } = useModel()
  const pm = C.per_model[model]
  const rows = P.per_model[model] ?? []
  const [pick, setPick] = useState<Pick | null>(null)
  const [want, setWant] = useState(4)

  return (
    <SceneShell
      number="11"
      kicker="Part V · is it just this model? · the shared prior"
      title={<>They do not merely lean the same way. They fill the same blanks with <em className="font-display italic text-emerald-300">the same words.</em></>}
      id="xa4"
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          Across every (prompt, question) blank any model fills, <strong>{C.n_slots} of them</strong>, how much of
          what a model assumes is its own, and how much is everyone's?
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-6 max-w-2xl">
          <InfoBox title="technical detail · reading the matrix">
            Rows: headline-tier named assumptions; columns: models; a cell's number is how many of that model's 54 cells fire the assumption above the naming threshold. Blank = outside that model's twenty most frequent, a cutoff, not an absence, and blanks are never imputed. Cross-model agreement is chance-corrected with Gwet's AC1 (an agreement score that discounts matches expected by luck) over the shared questions, against a permutation null.
          </InfoBox>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <Panel className="mt-10">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            {MODEL_NAME[model]} · what it shares, what it adds, where it stands alone
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/70">
            <span className="font-mono2 text-[13px]">W = W_shared ⊕ W_model</span>, measured.
          </p>

          {pm && (
            <div className="mt-6">
              <div className="flex h-8 overflow-hidden rounded-md">
                {([
                  ['shared', pm.shared, '--c-em', 'at least 4 of 7 agree'],
                  ['added', pm.added, '--c-amber', 'only 2–3 of 7'],
                  ['alone', pm.alone, '--c-red', 'this model alone'],
                ] as const).map(([k, v, cv, title]) => (
                  <motion.div
                    key={k}
                    className="flex items-center justify-center"
                    title={title}
                    initial={{ width: 0 }}
                    animate={{ width: `${(v / pm.own) * 100}%` }}
                    transition={{ duration: 0.5 }}
                    style={{ background: rgb(cv), opacity: 0.55 }}
                  >
                    <span className="font-mono2 text-[10px] text-foreground/90">{Math.round((v / pm.own) * 100)}%</span>
                  </motion.div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 font-mono2 text-[10px] text-foreground/45">
                <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: rgb('--c-em'), opacity: 0.55 }} />shared with ≥3 others ({pm.shared})</span>
                <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: rgb('--c-amber'), opacity: 0.55 }} />partly shared ({pm.added})</span>
                <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: rgb('--c-red'), opacity: 0.55 }} />its own ({pm.alone})</span>
                <span className="text-foreground/30">of {pm.own} headline assumptions</span>
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-border pt-6">
            <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
              what {MODEL_NAME[model]} assumes about <em>everything</em> · fires in N of {P.n_cells} prompts
            </div>
            <div className="mt-4 space-y-1.5">
              {rows.slice(0, 12).map((r) => (
                <div key={`${r.q}_${r.v}`} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-right font-mono2 text-[10px] text-foreground/50" title={Q_TEXT[r.q] ?? r.q}>
                    {Q_TEXT[r.q] ?? r.q}
                  </span>
                  <span className="w-24 shrink-0 truncate font-mono2 text-[11px] text-foreground/85">{r.v}</span>
                  <div className="relative h-4 min-w-0 flex-1 rounded-sm bg-foreground/5">
                    <motion.div
                      className="absolute inset-y-0.5 left-0 rounded-sm bg-emerald-400/50"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(r.n / P.n_cells) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right font-mono2 text-[10px] text-foreground/45">
                    {r.n}/{P.n_cells}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-foreground/70">
              The model's standing view of the world, before the prompt narrows anything down.
            </p>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
              the same assumptions, all seven models · read a column for a worldview, a row for the ecosystem's
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono2 text-[9px] text-foreground/35">hover a number for its images</p>
              <div className="flex items-center gap-1 font-mono2 text-[9px] text-foreground/35">
                <span className="mr-1">preview</span>
                {[
                  [1, '1'],
                  [2, '2'],
                  [4, '2×2'],
                ].map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setWant(k as number)}
                    aria-pressed={want === k}
                    className={`rounded border px-1.5 py-0.5 transition ${
                      want === k
                        ? 'border-amber-300/50 bg-amber-300/10 text-amber-200'
                        : 'border-border text-foreground/45 hover:text-foreground/80'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 overflow-x-auto" onMouseLeave={() => setPick(null)}>
              <table className="w-full min-w-[40rem] border-collapse">
                <thead>
                  <tr className="font-mono2 text-[9px] text-foreground/35">
                    <th className="w-56 pb-2 text-left font-normal">assumption</th>
                    {MODELS.map((m) => (
                      <th key={m.id} className="pb-2 text-center font-normal">
                        <span className="inline-block max-w-[4.5rem] truncate align-bottom" title={m.name}>
                          {short(m.id)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map((r) => (
                    <tr key={`${r.q}_${r.v}`} className="border-t border-border/40">
                      <td className="py-1 pr-3 font-mono2 text-[10px] text-foreground/55">
                        <span className="text-foreground/35">{Q_TEXT[r.q] ?? r.q}</span> {r.v}
                      </td>
                      {MODELS.map((m) => {
                        const n = r.by_model[m.id] ?? 0
                        const a = alphaFor(n)
                        const on = pick?.m === m.id && pick.q === r.q && pick.v === r.v
                        /* an empty cell has nothing to preview, and a cell whose
                           evidence is entirely held back has nothing either */
                        const show = n > 0 && firingCells(m.id, r.q, r.v).cells.length > 0
                        const enter = () => setPick(show ? { m: m.id, q: r.q, v: r.v, n } : null)
                        return (
                          <td key={m.id} className="p-0.5 text-center">
                            <button
                              onMouseEnter={enter}
                              onFocus={enter}
                              className={`mx-auto flex h-6 w-full items-center justify-center rounded-sm font-mono2 text-[9px] transition ${
                                on ? 'ring-2 ring-amber-300/80' : ''
                              }`}
                              style={{
                                background: rgba('--c-em', a),
                                /* past roughly half alpha the fill is bright enough that
                                   the page's cream ink stops reading on it */
                                color: a > 0.5 ? 'rgb(var(--bg))' : undefined,
                              }}
                              title={
                                n === 0
                                  ? `${short(m.id)}: outside this model's twenty most frequent assumptions, not "never"`
                                  : `${short(m.id)}: ${n} of ${P.n_cells} prompts${show ? ' · show the images' : ''}`
                              }
                            >
                              {n || ''}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 font-mono2 text-[10px] leading-4 text-foreground/40">
              a blank cell means the assumption ranked outside that model's twenty most frequent, not zero, and not missing data
            </p>
            {/* the ramp is not linear, so it has to show its own scale */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-3 flex-1 overflow-hidden rounded-sm">
                {Array.from({ length: N_HI - N_LO + 1 }, (_, i) => (
                  <div key={i} className="flex-1" style={{ background: rgba('--c-em', alphaFor(N_LO + i)) }} />
                ))}
              </div>
              <span className="font-mono2 text-[9px] whitespace-nowrap text-foreground/35">
                {N_LO} → {N_HI} of {P.n_cells} prompts · median {N_MED}
              </span>
            </div>
            {pick && <EvidencePreview pick={pick} want={want} />}
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <TierNote
              tier="evidence"
              text={`All seven models scored by the same single-annotator instrument, headline tier only; agreement is chance-corrected by Gwet's AC1 across models (${C.ac1.weighted.toFixed(3)}, item-weighted over ${C.ac1.n_questions} questions) and a ${C.null.n_perm}-shuffle permutation null (${C.null.unanimous.observed} of ${C.n_slots} blanks unanimous vs ${C.null.unanimous.mean} expected by chance, p ${C.null.unanimous.p < 0.001 ? '< 0.001' : `= ${C.null.unanimous.p}`}), with absent models never imputed.`}
            />
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}
