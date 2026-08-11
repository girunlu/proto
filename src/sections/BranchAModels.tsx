import { Fragment, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { CountUp } from '../components/CountUp'
import { rgb, rgba } from '../lib/colors'
import branchA from '../data/branchA.json'
import { ZoomImage, BoxPicker, BarRow, MetricToggle} from '../components/Viz'
import { XM, xmImgPath, Q_TEXT } from '../data/uiv2'
import { dist as xmDist, RULER_MAX, type Ruler } from '../data/crossmodel'
import { useModel, modelSeeds, type ModelId } from '../data/modelData'
import { C8, type Sit, type Code } from '../data/part1'
import { STATS } from '../data/research'

// ─── real data: every number below is recomputed from the analysis JSONs at export
// time (export_branch_a.py asserts 36/36, 286/288, 168/288 before writing) ───

type ModelKey = keyof typeof branchA.models
const MODEL_KEYS = Object.keys(branchA.models) as ModelKey[]
/* branchA.json ships untyped, and every read used to cast `as any` at its call site
   — eleven of them. One narrowing here instead, so the casts are in one place and
   the reads are checked. */
const MODEL_LABEL = branchA.models as Record<string, string>
const MODEL_DATA = branchA.data as Record<string, { distances: Record<string, Record<string, { mean: number }>> }>
const PER_MODEL = branchA.persistence.per_model as Record<string, number>

const SITS = branchA.sits as string[]
const CODES = branchA.codes as string[]

/* Both of these used to be declared here, duplicating C8 in data/part1 — and the
   copy had already drifted: it said "USA" where the rest of the page says "United
   States". One source now. */
const COUNTRY_CV = (c: string) => C8[c as Code]?.cv ?? '--c-gray'
const COUNTRY_NAME = (c: string) => C8[c as Code]?.name ?? c
/* In every model × event cell, the country furthest from a model's own default is
   never the US or Germany — computed from the same geometry the wall below renders,
   so the number cannot drift from it. */
const FURTHEST = (() => {
  let cells = 0
  let south = 0
  for (const m of MODEL_KEYS) {
    for (const sit of SITS) {
      let best = ''
      let bestD = -1
      for (const c of CODES) {
        const d = xmDist(m as ModelId, sit as Sit, c as Code, 'dinov3')?.mean
        if (d != null && d > bestD) {
          bestD = d
          best = c
        }
      }
      if (!best) continue
      cells++
      if (best === 'IN' || best === 'NG' || best === 'EG') south++
    }
  }
  return { cells, south }
})()
const MODEL_SUB: Record<string, string> = {
  sd21: 'the microscope model · 2022',
  flux_cultural: 'Black Forest Labs · 2024 · DiT',
  kolors_cultural: 'Kuaishou · 2024 · trained on Chinese-language data',
  sdxl_cultural: 'Stability · 2023 · UNet',
  sd35_cultural: 'Stability · 2024 · MMDiT',
  qwenimage_cultural: 'Alibaba · 2025 · Chinese-developed',
  hunyuandit_cultural: 'Tencent · 2024 · Chinese-developed',
}

/* xmImgPath (uiv2.ts) handles the SD 2.1 special case — its thumbnails live in
   images/seeds/ with zero-padded names, not images/xm/. A local helper that
   always built an xm/ path 404'd every SD 2.1 tile in this strip. */

export function ModelStrip() {
  /* R3b: this used to hold its own `useState('flux_cultural')`, so the global bar
     could read "showing Qwen-Image" while the strip below showed Flux. The chips
     now drive the global selection, which is what a reader assumes they do. */
  const { model, setModel } = useModel()
  const [sit, setSit] = useState('wedding')
  /* Tier C: both rulers now exist for every model here, so the "is this just how
     DINOv3 sees things?" question is answerable on this scene too, not only in
     Part I. */
  const [ruler, setRuler] = useState<Ruler>('dinov3')
  const dOf = (c: string) => xmDist(model as ModelId, sit as Sit, c as Code, ruler)

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
          pick any model · pick any situation
        </div>
        <MetricToggle value={ruler} onChange={setRuler} showLabel={false} />
        <div className="flex flex-wrap gap-1.5">
          {SITS.map((s) => (
            <button key={s} onClick={() => setSit(s)} className={`chip !px-2.5 !py-1 ${sit === s ? 'chip-active' : ''}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {MODEL_KEYS.map((m) => (
          <button key={m} onClick={() => setModel(m)} className={`chip ${model === m ? 'chip-active' : ''}`}>
            {MODEL_LABEL[m]}
          </button>
        ))}
      </div>
      <p className="mt-2 font-mono2 text-[11px] text-foreground/40">{MODEL_SUB[model]}</p>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${model}-${sit}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {/* The model's own default prompt, uncurated. Seeds come from that
              cell's published list rather than 0..19: the thumbnail set is a
              selected 24 of the 50, so counting from zero 404'd half this grid. */}
          <div className="mt-5 grid grid-cols-10 gap-1.5">
            {modelSeeds(model as ModelId, sit as Sit, 'default', 20).map((s) => (
              <div key={s} className="overflow-hidden rounded-md border border-border">
                <img
                  src={xmImgPath(model, sit as Sit, 'default', s)}
                  alt={`“a ${sit}” · ${MODEL_LABEL[model]} seed ${s}`}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
          <p className="mt-2 font-mono2 text-[11px] text-foreground/50">
            “a {sit}” · {MODEL_LABEL[model]}'s own unspecified prompt · 20 seeds, typical to unusual (no curation)
          </p>

          {/* distance bars, its own default as origin */}
          <div className="mt-6 space-y-2.5">
            {CODES.map((c, i) => {
              const d = dOf(c)
              return (
                <BarRow
                  key={c}
                  label={`…in ${COUNTRY_NAME(c)}`}
                  value={d.mean}
                  ci={[d.ci_low, d.ci_high]}
                  max={RULER_MAX[ruler].dist}
                  color="--c-amber"
                  delay={i * 0.05}
                />
              )
            })}
            <div className="flex items-center gap-3 pt-1">
              <span className="w-32 shrink-0" />
              <div className="flex flex-1 justify-between font-mono2 text-[10px] text-foreground/30">
                <span>0 · its own unspecified prompt</span>
                <span>{RULER_MAX[ruler].dist} ≈ a different scene entirely</span>
              </div>
              <span className="w-14 shrink-0" />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-6">
        <TierNote
          tier="evidence"
          text="Identical instrument on every model: 54 prompts × 50 seeds = 2,700 images each, bootstrap confidence intervals."
        />
      </div>
    </Panel>
  )
}

function ReplicationWall() {
  return (
    <Panel>
      <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
        <div className="text-center md:pr-4">
          <div className="font-mono2 text-7xl text-emerald-300">
            <CountUp to={36} duration={1.8} />
            <span className="text-foreground/30">/36</span>
          </div>
          <div className="mt-2 max-w-[200px] font-mono2 text-[11px] tracking-wider text-foreground/45 uppercase">
            scene × model pairs where Nigeria sits farther from the unspecified prompt than the USA
          </div>
        </div>

        <div>
          <div className="grid grid-cols-7 gap-1">
            <div />
            {MODEL_KEYS.filter((m) => m !== 'sd21').map((m) => (
              <div key={m} className="truncate text-center font-mono2 text-[9px] text-foreground/40">
                {MODEL_LABEL[m]}
              </div>
            ))}
            {SITS.map((s) => (
              <Fragment key={s}>
                <div className="pr-1 text-right font-mono2 text-[10px] text-foreground/50">
                  {s}
                </div>
                {MODEL_KEYS.filter((m) => m !== 'sd21').map((m, mi) => (
                  <motion.div
                    key={`${s}-${m}`}
                    className="flex aspect-[2/1] items-center justify-center rounded border border-emerald-400/20 bg-emerald-400/10 font-mono2 text-xs text-emerald-300"
                    initial={{ opacity: 0, scale: 0.7 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: (SITS.indexOf(s) * 6 + mi) * 0.03 }}
                  >
                    ✓
                  </motion.div>
                ))}
              </Fragment>
            ))}
          </div>
          {/* B9: "3 training lineages (Western, Chinese-language, mixed)" deleted.
              "Mixed" is unfalsifiable, and the project elsewhere relies on the fact
              that Kolors', Qwen-Image's and Hunyuan-DiT's corpora are NOT public
              (that is why scene 11's LAION correlation is undefined for them) — we
              cannot call the training data unknown and then sort it into lineages.
              5 developers is checkable and says more. B12: the denominators. */}
          <p className="mt-3 font-mono2 text-[11px] leading-5 text-foreground/50">
            Across <strong className="text-foreground/80">5 developers</strong> and 2 architecture families
            (UNet, DiT); three of the seven were developed in China. The gap is individually significant in{' '}
            <strong className="text-foreground/80">{branchA.dist_sig}/{branchA.n_cells}</strong> cells
            (permutation test, p&lt;0.05).
          </p>
        </div>
      </div>
    </Panel>
  )
}

/* A·3, the images half: for each event and country we take the single least
   typical seed each of the seven models produced, put them side by side, and
   list the assumptions that fire in all of them anyway. */
export function SharedWorldview() {
  const [sit, setSit] = useState('wedding')
  const [code, setCode] = useState('NG')
  const cellKey = `${sit}_${code}`
  const x = XM[cellKey]
  const label = code === 'default' ? `“a ${sit}”` : `“a ${sit} in ${COUNTRY_NAME(code)}”`

  return (
    <Panel className="mb-6">
      <div className="flex flex-col gap-2.5">
        <BoxPicker
          label="scene"
          value={sit}
          onChange={setSit}
          options={SITS.map((s) => ({ value: s, label: `a ${s}` }))}
          size="sm"
        />
        <BoxPicker
          label="country"
          value={code}
          onChange={setCode}
          options={[{ value: 'default' as const, label: 'unspecified prompt' },
...CODES.map((c) => ({ value: c, label: COUNTRY_NAME(c), cv: COUNTRY_CV(c) }))]}
          size="sm"
        />
      </div>

      {x && (
        <>
          <div className="mt-6 font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
            {label} · the least typical seed each of the seven models produced
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 md:grid-cols-7">
            {x.picks.map((p) => (
              <figure key={`${p.model}-${p.seed}`}>
                <ZoomImage
                  src={xmImgPath(p.model, sit as never, code as never, p.seed)}
                  alt={`${label} by ${MODEL_LABEL[p.model] ?? p.model}, seed ${p.seed}`}
                  caption={`${label} · ${MODEL_LABEL[p.model] ?? p.model} · seed ${p.seed} · this model's least typical seed for the cell`}
                  imgClassName="aspect-square w-full cursor-zoom-in rounded-md border border-border object-cover"
                />
                <figcaption className="mt-1.5 truncate font-mono2 text-[9px] text-foreground/45">
                  {MODEL_LABEL[p.model] ?? p.model}
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-2 font-mono2 text-[10px] leading-4 text-foreground/40">
            For each model, the seed furthest from the pooled centre of all seven models' output: the most
            different pictures the ecosystem has to offer for this prompt.
          </p>

          <div className="mt-6 border-t border-border pt-5">
            <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
              and yet, what all seven agree on for {label}
            </div>
            {x.shared.length ? (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {x.shared.map((a) => {
                    const all = a.n === 6
                    return (
                      <span
                        key={a.q}
                        className={`rounded-md border px-2.5 py-1.5 font-mono2 text-[11px] ${all ? 'border-emerald-400/35 bg-emerald-400/8' : 'border-border bg-background/40'}`}
                      >
                        <span className="text-foreground/40">{Q_TEXT[a.q] ?? a.q}:</span>{' '}
                        <span className={all ? 'text-emerald-300' : 'text-foreground/80'}>{a.v}</span>
                        <span className="ml-1.5 text-foreground/35">{a.n}/6</span>
                      </span>
                    )
                  })}
                </div>
                <p className="mt-3 font-mono2 text-[10px] leading-4 text-foreground/40">
                  {x.shared.filter((a) => a.n === 6).length} of these fire in every other model (green);
                  assumptions only SD 2.1 makes are not listed.
                </p>
              </>
            ) : (
              <p className="mt-3 font-mono2 text-[11px] text-foreground/45">
                Nothing SD 2.1 assumes for this prompt is repeated by four or more of the other six models; about a
                fifth of its assumptions are this specific to it.
              </p>
            )}
          </div>
        </>
      )}
    </Panel>
  )
}

/* The obvious next question is whether something stronger also holds: is the
   USA simply the closest country, everywhere? We checked, and it is not. The
   panel reports every version we tried, including the ones that failed. */
function StrongerClaims() {
  const models = MODEL_KEYS
  const WEST = ['US', 'DE']
  const SOUTH = ['NG', 'IN', 'ID', 'EG']
  const checks = [
    { label: 'the USA is closer to the model’s own unspecified prompt than Nigeria is', test: (d: Record<string, number>) => d.US < d.NG },
    { label: 'the two Western countries average closer than the four Global-South ones', test: (d: Record<string, number>) => WEST.reduce((a, c) => a + d[c], 0) / 2 < SOUTH.reduce((a, c) => a + d[c], 0) / 4 },
    { label: 'the closest of the eight countries is the USA or Germany', test: (d: Record<string, number>) => WEST.includes(Object.keys(d).reduce((a, b) => (d[a] < d[b] ? a : b))) },
    { label: 'the USA is closer than every Global-South country', test: (d: Record<string, number>) => SOUTH.every((c) => d.US < d[c]) },
    { label: 'the USA is the single closest country of the eight', test: (d: Record<string, number>) => Object.keys(d).reduce((a, b) => (d[a] < d[b] ? a : b)) === 'US' },
  ]
  const results = checks.map((c) => {
    let pass = 0
    let total = 0
    models.forEach((m) => {
      SITS.forEach((sit) => {
        const raw = MODEL_DATA[m].distances[sit]
        const d = Object.fromEntries(CODES.map((k) => [k, raw[k].mean])) as Record<string, number>
        total += 1
        if (c.test(d)) pass += 1
      })
    })
    return { ...c, pass, total }
  }).sort((a, b) => b.pass / b.total - a.pass / a.total)

  return (
    <Panel className="mt-6">
      <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
        how far the claim generalises
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/60">
        Stronger versions of the claim, tested across all {models.length} models × {SITS.length} scenes.
        Only the first holds without exception, and it is the one this page states.
      </p>
      <div className="mt-5 space-y-2">
        {results.map((r) => {
          const frac = r.pass / r.total
          const universal = r.pass === r.total
          return (
            <div key={r.label} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-right font-mono2 text-sm" style={{ color: rgb(universal ? '--c-em-t' : '--c-gray-t') }}>
                {r.pass}/{r.total}
              </span>
              <div className="relative h-5 w-32 shrink-0 overflow-hidden rounded-sm bg-foreground/8">
                <motion.div
                  className="absolute inset-y-0 left-0"
                  style={{ background: universal ? rgb('--c-em') : rgba('--c-gray', 0.55) }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${frac * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                />
              </div>
              <span className={`flex-1 text-[13px] leading-5 ${universal ? 'text-foreground/85' : 'text-foreground/50'}`}>
                {r.label}
                {universal && <span className="ml-2 font-mono2 text-[10px] text-emerald-300">no exceptions</span>}
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-foreground/60">
        Where the USA is not the single closest country, the closest is almost always Germany or Russia, and the
        exceptions concentrate on “a celebration”, the scene whose unspecified prompt is the most diffuse of the six. The pull is
        Western, but a gradient across several Western countries, not a bullseye on one.
      </p>
    </Panel>
  )
}

export function PersistenceChart() {
  const hist = branchA.persistence.histogram as Record<string, number>
  const max = Math.max(...Object.values(hist))
  return (
    <Panel>
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            each of SD 2.1's {branchA.persistence.total} named assumptions, checked in all 6 other models
          </div>
          {/* B3a used to carry a caveat here: Part IV reported SD 2.1's two-annotator
              table (641) while this panel used the gemma4-matched one (708), and the
              page had to say they differed. gemma4 became the sole annotator on
              2026-07-31, so both numbers are now the same table and the caveat is gone. */}
          <div className="mt-6 flex items-end gap-2" style={{ height: 180 }}>
            {Object.entries(hist).map(([k, v]) => {
              const highlight = k === '6' ? '--c-em' : k === '0' ? '--c-red' : '--c-gray'
              return (
                <div key={k} className="flex flex-1 flex-col items-center justify-end gap-1.5 self-stretch">
                  <span className="font-mono2 text-[11px]" style={{ color: rgb(`${highlight}-t`) }}>
                    {v}
                  </span>
                  <motion.div
                    className="w-full rounded-t"
                    style={{ background: k === '6' || k === '0' ? rgb(highlight) : rgba(highlight, 0.45) }}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${(v / max) * 130}px` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: Number(k) * 0.06 }}
                  />
                  <span className="font-mono2 text-[10px] text-foreground/40">{k}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-1 text-center font-mono2 text-[10px] text-foreground/35">
            in how many of the 6 other models does the assumption persist?
          </div>
        </div>

        <div className="space-y-5 self-center">
          <div className="flex items-baseline gap-3">
            <span className="font-mono2 text-4xl text-emerald-300">
              <CountUp to={branchA.persistence.ecosystem} duration={1.6} />
            </span>
            <p className="prose-scene !text-sm">
              persist in <strong>all six</strong>: assumptions of the shared training{' '}
              <strong>ecosystem</strong>, not of one checkpoint. 30.6% of everything SD 2.1 assumes.
            </p>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono2 text-4xl text-red-300">
              <CountUp to={branchA.persistence.sd21_only} duration={1.6} />
            </span>
            <p className="prose-scene !text-sm">
              appear in <strong>none</strong> of the others, genuinely SD-2.1-specific quirks. 19.9%.
            </p>
          </div>
          <p className="font-mono2 text-[11px] leading-5 text-foreground/45">
            per-model persistence of SD 2.1's set: {MODEL_KEYS.filter((m) => m !== 'sd21')
.map((m) => `${MODEL_LABEL[m]} ${PER_MODEL[m]}`)
.join(' · ')}
          </p>
        </div>
      </div>
      <div className="mt-6">
        <TierNote
          tier="evidence"
          text="All seven models annotated under the identical setup."
        />
      </div>
    </Panel>
  )
}

export default function BranchAModels() {
  return (
    <>
      {/* Scene 08 ("Swap the model. The unspecified prompt doesn't blink." /
          ModelStrip) is DISMISSED, 2026-08-06: a duplicate — scene 02's grid already
          shows each model's own images and their differences. */}

      <SceneShell
        number="X1"
        kicker="appendix · across models"
        title={
          <>
            Thirty-six of thirty-six.
          </>
        }
        id="xa2"
      >
        <Reveal delay={0.1}>
          <p className="prose-scene mb-8 max-w-2xl">
            Is “…in Nigeria” farther from each model's own unspecified prompt than “…in the USA”? Not{' '}
            <em>usually</em>. <strong>Always.</strong> The Western alignment is not a property of one
            checkpoint; it is a property of how these systems are made. And the furthest country from the unspecified prompt is
            never the US or Germany: in <strong>{FURTHEST.south} of {FURTHEST.cells}</strong> model × scene cells it
            is India, Nigeria or Egypt, whichever model, whichever scene.
          </p>
        </Reveal>
        <ReplicationWall />
        <Reveal delay={0.12}>
          <StrongerClaims />
        </Reveal>
        <Reveal delay={0.15}>
          {/* Readable size, not fine print: a correction that weakens a claim belongs
              at the same size as the claim.

              Rewritten 2026-08-11 (Giray) for a reader who has just landed. The
              previous version leaned on four terms the page never defines — "cell",
              "the distance", "travels", "the predicted direction" — and named the
              correction before saying what it corrects for. Same length, no jargon
              left unpacked. Every number is still read from branchA.json; only the
              words changed. */}
          <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground/60">
            Naming a country also makes a set more uniform: its {STATS.seeds} images come out more alike than the
            unspecified prompt's {STATS.seeds}. That pattern holds across the models too, though less firmly. Running{' '}
            {branchA.n_cells} comparisons at once means a few will look real by chance, so the counts are corrected for
            that (Benjamini–Hochberg, 5% false-discovery rate):{' '}
            <strong className="text-foreground/85">
              {branchA.fdr.distance.survivors} of {branchA.fdr.distance.n}
            </strong>{' '}
            distance gaps hold, and{' '}
            <strong className="text-foreground/85">
              {branchA.fdr.intraset_directional.survivors} of {branchA.fdr.intraset_directional.n}
            </strong>{' '}
            sets still tighten. Weaker after correction, and still there.
          </p>
        </Reveal>
      </SceneShell>

      {/* X2, "whose assumptions are they?" (the 708 / 217 / 141 persistence scene),
          is DISMISSED 2026-08-10 (Giray), and confirmed out on 2026-08-11 — the
          framing does not survive its own numbers. The 217 re-derives exactly, but 48
          of it is one question (U09, "is it daytime?", answered "day" in all 54 cells
          by all 7 models) and 49 more assert a bare "no". Drop those and 217 becomes
          120. Heritability correlates with how few answers a question admits
          (r = -0.42 across 37 questions), and no chance baseline exists for the binary
          questions. SharedWorldview and PersistenceChart above are unreachable. */}
    </>
  )
}
