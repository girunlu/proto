import { Fragment, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { CountUp } from '../components/CountUp'
import { rgb, rgba } from '../lib/colors'
import branchA from '../data/branchA.json'
import { ZoomImage, BoxPicker, BarRow, MetricToggle } from '../components/Viz'
import { XM, xmImgPath, Q_TEXT } from '../data/uiv2'
import { dist as xmDist, RULER_MAX, type Ruler } from '../data/crossmodel'
import type { ModelId } from '../data/modelData'
import type { Sit, Code } from '../data/part1'

// ─── real data: every number below is recomputed from the analysis JSONs at export
// time (export_branch_a.py asserts 36/36, 286/288, 168/288 before writing) ───

type ModelKey = keyof typeof branchA.models
const MODEL_KEYS = Object.keys(branchA.models) as ModelKey[]
const SITS = branchA.sits as string[]
const CODES = branchA.codes as string[]

const COUNTRY_CV: Record<string, string> = {
  US: '--c-us', DE: '--c-de', RU: '--c-ru', ID: '--c-id',
  JP: '--c-jp', EG: '--c-eg', IN: '--c-in', NG: '--c-ng',
}
const COUNTRY_NAME: Record<string, string> = {
  US: 'USA', DE: 'Germany', RU: 'Russia', ID: 'Indonesia',
  JP: 'Japan', EG: 'Egypt', IN: 'India', NG: 'Nigeria',
}
const MODEL_SUB: Record<string, string> = {
  sd21: 'the microscope model · 2022',
  flux_cultural: 'Black Forest Labs · 2024 · DiT',
  kolors_cultural: 'Kuaishou · 2024 · trained on Chinese-language data',
  sdxl_cultural: 'Stability · 2023 · UNet',
  sd35_cultural: 'Stability · 2024 · MMDiT',
  qwenimage_cultural: 'Alibaba · 2025 · Chinese-developed',
  hunyuandit_cultural: 'Tencent · 2024 · Chinese-developed',
}

const xmImg = (model: string, sit: string, code: string, s: number) =>
  `images/xm/${model}_${sit}_${code}_s${s}.webp`

function ModelStrip() {
  const [model, setModel] = useState<ModelKey>('flux_cultural')
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
            {(branchA.models as any)[m]}
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
          {/* the model's own unqualified default: first 9 seeds, no curation */}
          <div className="mt-5 grid grid-cols-10 gap-1.5">
            {Array.from({ length: 20 }, (_, s) => (
              <div key={s} className="overflow-hidden rounded-md border border-border">
                <img
                  src={xmImg(model, sit, 'default', s)}
                  alt={`“a ${sit}” · ${(branchA.models as any)[model]} seed ${s}`}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
          <p className="mt-2 font-mono2 text-[11px] text-foreground/50">
            “a {sit}” · {(branchA.models as any)[model]}'s own default, seeds 00–19 straight off the run (no curation)
          </p>

          {/* distance bars, its own default as origin */}
          <div className="mt-6 space-y-2.5">
            {CODES.map((c, i) => {
              const d = dOf(c)
              return (
                <BarRow
                  key={c}
                  label={`…in ${COUNTRY_NAME[c]}`}
                  value={d.mean}
                  ci={[d.ci_low, d.ci_high]}
                  max={RULER_MAX[ruler].dist}
                  color={COUNTRY_CV[c]}
                  delay={i * 0.05}
                />
              )
            })}
            <div className="flex items-center gap-3 pt-1">
              <span className="w-32 shrink-0" />
              <div className="flex flex-1 justify-between font-mono2 text-[10px] text-foreground/30">
                <span>0 · its own default</span>
                <span>{RULER_MAX[ruler].dist} ≈ a different event entirely</span>
              </div>
              <span className="w-14 shrink-0" />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-6">
        <TierNote
          tier="evidence"
          text="Distance measured from each model's OWN plain prompt, 50 seeds per prompt, with bootstrap confidence intervals. The identical frozen instrument (54 prompts × 50 seeds) was run in full on every model: 2,700 verified-complete images each."
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
            situation × model pairs where Nigeria sits farther from the default than the USA
          </div>
        </div>

        <div>
          <div className="grid grid-cols-7 gap-1">
            <div />
            {MODEL_KEYS.filter((m) => m !== 'sd21').map((m) => (
              <div key={m} className="truncate text-center font-mono2 text-[9px] text-foreground/40">
                {(branchA.models as any)[m]}
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
          <p className="mt-3 font-mono2 text-[11px] leading-5 text-foreground/50">
            zero exceptions, across 3 training lineages (Western, Chinese-language, mixed) and 2
            architecture families (UNet, DiT). The distance gap is individually significant in{' '}
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
function SharedWorldview() {
  const [sit, setSit] = useState('wedding')
  const [code, setCode] = useState('NG')
  const cellKey = `${sit}_${code}`
  const x = XM[cellKey]
  const label = code === 'default' ? `“a ${sit}”` : `“a ${sit} in ${COUNTRY_NAME[code]}”`

  return (
    <Panel className="mb-6">
      <div className="flex flex-col gap-2.5">
        <BoxPicker
          label="event"
          value={sit}
          onChange={setSit}
          options={SITS.map((s) => ({ value: s, label: `a ${s}` }))}
          size="sm"
        />
        <BoxPicker
          label="country"
          value={code}
          onChange={setCode}
          options={[{ value: 'default' as const, label: 'no country' },
...CODES.map((c) => ({ value: c, label: COUNTRY_NAME[c], cv: COUNTRY_CV[c] }))]}
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
                  alt={`${label} by ${(branchA.models as any)[p.model] ?? p.model}, seed ${p.seed}`}
                  caption={`${label} · ${(branchA.models as any)[p.model] ?? p.model} · seed ${p.seed} · this model's least typical seed for the cell`}
                  imgClassName="aspect-square w-full cursor-zoom-in rounded-md border border-border object-cover"
                />
                <figcaption className="mt-1.5 truncate font-mono2 text-[9px] text-foreground/45">
                  {(branchA.models as any)[p.model] ?? p.model}
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-2 font-mono2 text-[10px] leading-4 text-foreground/40">
            Not a curated line-up: for each model we picked the single seed furthest from the pooled centre of all
            seven models' output, so these are the most different pictures the ecosystem has to offer for this prompt.
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
                  {x.shared.filter((a) => a.n === 6).length} of these fire in <em>every</em> one of the other six models
                  (green); the rest fire in four or five of them. The number after each is how many of the six repeat
                  it. Assumptions that only SD 2.1 makes are not listed here.
                </p>
              </>
            ) : (
              <p className="mt-3 font-mono2 text-[11px] text-foreground/45">
                Nothing SD 2.1 assumes for this prompt is repeated by four or more of the other six models. About a
                fifth of its assumptions are this specific to it, and we show the empty cells rather than only the
                full ones.
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
    { label: 'the USA is closer to the model’s own default than Nigeria is', test: (d: Record<string, number>) => d.US < d.NG },
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
        const raw = (branchA.data as any)[m].distances[sit]
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
        If the default is Western, a stronger statement should also hold: that the USA is simply the closest of the
        eight countries, in every model and every event. We tested that formulation and four intermediate ones across
        all {models.length} models × {SITS.length} events. Only the first holds without exception, and it is the one
        this page states.
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
        The cases that fail are informative. Where the USA is not the single closest country, the closest is almost
        always Germany or Russia, and the exceptions concentrate on “a celebration”, the event with the most diffuse
        default of the six. The pull is Western, but it is a gradient across several Western countries rather than a
        bullseye on one of them.
      </p>
    </Panel>
  )
}

function PersistenceChart() {
  const hist = branchA.persistence.histogram as Record<string, number>
  const max = Math.max(...Object.values(hist))
  return (
    <Panel>
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            each of SD 2.1's 708 named assumptions, checked in all 6 other models
          </div>
          <div className="mt-6 flex items-end gap-2" style={{ height: 180 }}>
            {Object.entries(hist).map(([k, v]) => {
              const highlight = k === '6' ? '--c-em' : k === '0' ? '--c-red' : '--c-gray'
              return (
                <div key={k} className="flex flex-1 flex-col items-center justify-end gap-1.5 self-stretch">
                  <span className="font-mono2 text-[11px]" style={{ color: rgb(`${highlight}-t` as any) }}>
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
              <CountUp to={217} duration={1.6} />
            </span>
            <p className="prose-scene !text-sm">
              persist in <strong>all six</strong>: assumptions of the shared training{' '}
              <strong>ecosystem</strong>, not of one checkpoint. 30.6% of everything SD 2.1 assumes.
            </p>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono2 text-4xl text-red-300">
              <CountUp to={141} duration={1.6} />
            </span>
            <p className="prose-scene !text-sm">
              appear in <strong>none</strong> of the others, genuinely SD-2.1-specific quirks. 19.9%.
            </p>
          </div>
          <p className="font-mono2 text-[11px] leading-5 text-foreground/45">
            per-model persistence of SD 2.1's set: {MODEL_KEYS.filter((m) => m !== 'sd21')
.map((m) => `${(branchA.models as any)[m]} ${(branchA.persistence.per_model as any)[m]}`)
.join(' · ')}
          </p>
        </div>
      </div>
      <div className="mt-6">
        <TierNote
          tier="evidence"
          text="Instrument-matched comparison: both sides measured by the identical annotator setup. Swapping a model changes at most a third of what gets assumed; the rest travels with the ecosystem."
        />
      </div>
    </Panel>
  )
}

export default function BranchAModels() {
  return (
    <>
      <SceneShell
        number="VII·1"
        kicker="part vii · across the ecosystem"
        title={
          <>
            Swap the model. <span className="text-amber-200">The default doesn't blink.</span>
          </>
        }
        id="xa1"
      >
        <Reveal delay={0.1}>
          <p className="prose-scene mb-8 max-w-2xl">
            Everything so far measured one model. The obvious objection: <em>maybe it's just SD 2.1.</em>{' '}
            So the same frozen instrument, all 54 prompts and all 50 seeds, ran in full on{' '}
            <strong>six more models</strong>: newer, bigger, differently trained, two of them developed
            in China. Below are their own images and their own geometry. Judge for yourself before the
            statistics do.
          </p>
        </Reveal>
        <ModelStrip />
      </SceneShell>

      <SceneShell
        number="VII·2"
        kicker="part vii · zero exceptions"
        title={
          <>
            Thirty-six of thirty-six.
          </>
        }
        id="xa2"
      >
        <Reveal delay={0.1}>
          <p className="prose-scene mb-8 max-w-2xl">
            For every situation, in every model: is “…in Nigeria” farther from that model's own
            default than “…in the USA”? Not <em>usually</em>. <strong>Always.</strong> The Western
            default is not a property of one checkpoint. It is a property of how these systems are made.
          </p>
        </Reveal>
        <ReplicationWall />
        <Reveal delay={0.12}>
          <StrongerClaims />
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-4 font-mono2 text-[11px] leading-5 text-foreground/45">
            the stereotyping inversion (country-qualified narrower than default) also travels: the
            homogeneity gap is significant in {branchA.intraset_sig}/{branchA.n_cells} cells. A spread
            statistic is inherently noisier than a distance; the direction is broadly confirmed, and we
            say exactly that rather than more.
          </p>
        </Reveal>
      </SceneShell>

      <SceneShell
        number="VII·3"
        kicker="part vii · whose assumptions are they?"
        title={
          <>
            A third of the worldview is <span className="text-emerald-300">inherited</span>.
          </>
        }
        id="xa3"
      >
        <Reveal delay={0.1}>
          <p className="prose-scene mb-8 max-w-2xl">
            Every named assumption from the audit was re-checked in all six other models. If an
            assumption fires everywhere, it does not belong to SD 2.1. It belongs to the{' '}
            <strong>ecosystem</strong>: the shared data, the shared filtering, the shared way these
            models are taught what the world looks like. Below, pick any prompt and see the most
            different pictures the seven models can produce for it, next to what they agree on anyway.
          </p>
        </Reveal>
        <SharedWorldview />
        <PersistenceChart />
      </SceneShell>
    </>
  )
}
