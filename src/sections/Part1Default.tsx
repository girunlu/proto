import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { CountUp } from '../components/CountUp'
import { ZoomImage, BarRow, DistanceRuler, KnnNote, BoxPicker, MetricToggle, useMagnet } from '../components/Viz'
import { rgb, rgba } from '../lib/colors'
import {
  SITS, COUNTRY8, C8, CV_DEFAULT, cell, decisionsFor, F3, F3_SOUTH_COUNT, F3_TOTAL, SOUTH,
  SILHOUETTE_RANGE, seedImg,
  type Sit, type Code,
} from '../data/part1'
import { HARDENING, key } from '../data/uiv2'
import { useModel, modelImg, modelSeeds, seedCount, isSd21, MODEL_NAME, type ModelId } from '../data/modelData'
/* Tier C: both rulers now exist for all seven models (the CLIP tables were
   already computed, they were simply never exported), so these read straight
   through instead of falling back to DINOv3 for the cross-model six. */
import { dist, distOrNull, RULER_MAX, umapFor, emptyFor, emptyImg, type Ruler } from '../data/crossmodel'

export type { Ruler }
const SIT_OPTS = SITS.map((s) => ({ value: s, label: `a ${s}` }))

/* ── shared bits ─────────────────────────────────────────────────────────── */

/* The legend doubles as the filter: hovering an entry brings that country's points
   forward and fades the rest, which is the only way to follow one country through a
   cloud of 240 dots. Clicking pins it so the pointer can leave. */
export type Focus = Code | 'default' | null

function Legend({ withDefault = true, focus, onFocus }: {
  withDefault?: boolean
  focus?: Focus
  onFocus?: (c: Focus) => void
}) {
  const entries: { id: Code | 'default'; name: string; cv: string }[] = [
    ...(withDefault ? [{ id: 'default' as const, name: 'default', cv: CV_DEFAULT }] : []),
    ...COUNTRY8.map((c) => ({ id: c.id as Code | 'default', name: c.name, cv: c.cv })),
  ]
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {entries.map((e) => {
        const dim = onFocus && focus != null && focus !== e.id
        return (
          <button
            key={e.id}
            onMouseEnter={() => onFocus?.(e.id)}
            onMouseLeave={() => onFocus?.(null)}
            onClick={() => onFocus?.(focus === e.id ? null : e.id)}
            disabled={!onFocus}
            className={`flex items-center gap-1.5 font-mono2 text-[10px] transition ${
              dim ? 'text-foreground/25' : 'text-foreground/50'
            } ${onFocus ? 'cursor-pointer hover:text-foreground/80' : 'cursor-default'} ${
              focus === e.id ? 'text-foreground/90' : ''
            }`}
          >
            <span
              className="h-2 w-2 rounded-full transition"
              style={{ background: rgb(e.cv), opacity: dim ? 0.3 : 1 }}
            />
            {e.name}
          </button>
        )
      })}
      {onFocus && (
        <span className="font-mono2 text-[9px] text-foreground/30">
          {focus ? 'click again to release' : 'hover a country to isolate it'}
        </span>
      )}
    </div>
  )
}

/* ── Scene 1 · the unsaid (ported from Layer1Unsaid) ─────────────────────── */

/* The dice. The wall normally shows a typicality spread (typical → outlier);
   a roll picks uniformly at random instead — the "never trust one seed" lesson
   made clickable. Deterministic per (model, cell, roll) so re-renders don't
   reshuffle on their own. */
function hashStr(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function rolledSeeds(m: ModelId, sit: Sit, code: Code | 'default', n: number, roll: number) {
  const total = seedCount(m)
  const rnd = mulberry32(hashStr(`${m}_${sit}_${code}_${roll}`))
  const pool = Array.from({ length: total }, (_, i) => i)
  const picks: number[] = []
  while (picks.length < Math.min(n, total)) {
    picks.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0])
  }
  return picks.sort((a, b) => a - b)
}

function UnsaidScene() {
  const [sit, setSit] = useState<Sit>('wedding')
  const [active, setActive] = useState(0)
  /* the same two-word prompt exists for all six events, so the reader can check
     that the effect is not something peculiar to weddings */
  const decisions = useMemo(() => decisionsFor(sit), [sit])
  const pick = Math.min(active, decisions.length - 1)
  return (
    <SceneShell
      number="01"
      kicker="Part I · the default · the unsaid"
      title={<>Two words; <em className="font-display italic text-amber-200">thousands of decisions</em> left to the model.</>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          A prompt of <strong>“a {sit}”</strong> specifies a noun and an article. The image additionally requires a
          setting, clothing, a crowd, architecture, an era, a palette, a light level, and a wealth level. These choices
          are not random in any meaningful sense: the model resolves each from its prior, in the same way, on nearly
          every seed. The decisions below are the answers Stable Diffusion gives <strong>when nothing is specified at all</strong>.
          Switch the event to see the same thing happen somewhere else.
        </p>
      </Reveal>
      <div className="mt-12 grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <Reveal delay={0.05}>
          <Panel className="h-full">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">the prompt</div>
            <div className="font-display mt-3 text-5xl font-light">
              “a <span className="text-amber-200">{sit}</span>”
            </div>
            <div className="mt-5">
              <BoxPicker label="event" value={sit} onChange={(v) => { setSit(v); setActive(0) }} options={SIT_OPTS} size="sm" />
            </div>
            <div className="mt-8 flex items-baseline gap-3">
              <CountUp to={2} className="font-mono2 text-6xl text-foreground" />
              <span className="text-foreground/50 text-sm">words specified</span>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-mono2 text-6xl text-amber-200">
                <CountUp to={1000} suffix="s" />
              </span>
              <span className="text-foreground/50 text-sm">of decisions left open: scene attributes, then every pixel</span>
            </div>
            <div className="mt-8 border-t border-border pt-5">
              <TierNote
                tier="evidence"
                text="Answers below come from the Assumption Auditor: 2 VQA annotators × 50 seeds per prompt, cross-annotator agreement AC1 ≥ 0.4, 693 named assumptions project-wide (375 headline-tier)."
              />
            </div>
          </Panel>
        </Reveal>
        <Reveal delay={0.15}>
          <Panel className="h-full">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">what the model supplies</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {decisions.map((d, i) => (
                <button key={d.attr} onClick={() => setActive(i)} className={`chip ${pick === i ? 'chip-active' : ''}`}>
                  {d.attr}
                </button>
              ))}
            </div>
            <motion.div
              key={`${sit}-${pick}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-8 rounded-lg border border-amber-300/20 bg-amber-300/5 p-6"
            >
              <div className="font-mono2 text-[11px] tracking-widest text-amber-200/70 uppercase">unspecified → supplied</div>
              <div className="font-display mt-2 text-3xl font-light">
                {decisions[pick].attr} = <span className="text-amber-200">“{decisions[pick].answer}”</span>
              </div>
              <div className="mt-3 font-mono2 text-xs text-foreground/50">{decisions[pick].stat}</div>
            </motion.div>
            <p className="mt-6 text-sm leading-6 text-foreground/60">
              A hidden assumption is an attribute the prompt <em>did not</em> specify, supplied with high consistency
              across seeds. Individually, each appears innocuous; jointly, they constitute a coherent worldview.
            </p>
          </Panel>
        </Reveal>
      </div>
    </SceneShell>
  )
}

/* ── Scene 2 · the default has a nationality (F1) ────────────────────────── */

/* Every cell visible at once as an image mosaic with a distance bar on one
   shared scale. Hovering a cell fills the inspector beside the wall, and the
   ZoomImage corner panel enlarges the individual seed under the cursor. */
function MosaicWall({ onSelect, ruler, roll, controls }: {
  onSelect: (s: Sit) => void
  ruler: Ruler
  roll: number
  /* the ruler switch and the dice: they sit under the inspector rather than in the
     panel header, where they crowded the title and hung over the wall's edge */
  controls: ReactNode
}) {
  const { model } = useModel()
  const [hover, setHover] = useState<{ sit: Sit; code: Code | 'default' }>({ sit: 'wedding', code: 'NG' })
  const pick = (sit: Sit, code: Code | 'default', n: number) =>
    roll === 0 ? modelSeeds(model, sit, code, n) : rolledSeeds(model, sit, code, n, roll)
  const hoverSeeds = pick(hover.sit, hover.code, 4)
  const hoverCv = hover.code === 'default' ? CV_DEFAULT : C8[hover.code].cv
  const hoverDist = distOrNull(model, hover.sit, hover.code, ruler)
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
      <div>
        <div className="space-y-1.5">
          <div className="grid grid-cols-[80px_repeat(9,1fr)] gap-1.5">
            <div />
            {(['default',...COUNTRY8.map((c) => c.id)] as (Code | 'default')[]).map((code) => (
              <div key={code} className="text-center font-mono2 text-[10px]" style={{ color: code === 'default' ? rgb(CV_DEFAULT) : rgb(C8[code].cv) }}>
                {code === 'default' ? 'default' : code}
              </div>
            ))}
          </div>
          {SITS.map((sit) => (
            <div key={sit} className="grid grid-cols-[80px_repeat(9,1fr)] gap-1.5">
              <button onClick={() => onSelect(sit)} className="pr-2 text-left font-mono2 text-[11px] text-foreground/60 hover:text-amber-200">
                {sit}
              </button>
              {(['default', ...COUNTRY8.map((c) => c.id)] as (Code | 'default')[]).map((code) => {
                const picks = pick(sit, code, 4)
                const d = distOrNull(model, sit, code, ruler)?.mean ?? 0
                const cv = code === 'default' ? CV_DEFAULT : C8[code].cv
                const active = hover.sit === sit && hover.code === code
                return (
                  <button
                    key={code}
                    onClick={() => onSelect(sit)}
                    onMouseEnter={() => setHover({ sit, code })}
                    className="group text-left"
                  >
                    <div className={`grid grid-cols-2 gap-px overflow-hidden rounded-md border transition ${active ? 'border-amber-300/70' : 'border-border group-hover:border-foreground/40'}`}>
                      {picks.map((seed) => (
                        <img key={seed} src={modelImg(model, sit, code, seed)} alt={`${sit} ${code} seed ${seed}`} loading="lazy" className="aspect-square w-full object-cover" />
                      ))}
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-foreground/10">
                      <motion.div
                        className="h-1.5 rounded-full"
                        style={{ background: rgb(cv) }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${code === 'default' ? 2 : (d / RULER_MAX[ruler].dist) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
          <div className="mt-3 flex items-start gap-3 rounded-md border border-border bg-background/40 p-3">
            <div className="mt-1 w-24 shrink-0">
              <div className="h-1.5 rounded-full bg-foreground/10">
                <div className="h-1.5 w-2/3 rounded-full bg-amber-300" />
              </div>
            </div>
            <p className="font-mono2 text-[10px] leading-4 text-foreground/50">
              the bar under each cell is one measurement: how far that variant's 50 images sit from the
              plain prompt in its own row. Empty bar means “the plain prompt already draws this”. A bar
              running the full width means the two prompts draw as different a scene as a wedding and a
              breakfast. The full scale is spelled out below.
            </p>
          </div>
        </div>
      </div>
      {/* the inspector: always populated, never covers the wall */}
      <div>
        <div className="sticky top-24 space-y-3">
          <div className="hidden rounded-xl border border-border bg-background/70 p-3 lg:block">
          <div className="font-mono2 text-[11px] leading-4" style={{ color: rgb(hoverCv) }}>
            “a {hover.sit}{hover.code === 'default' ? '' : ` in ${C8[hover.code].name}`}”
          </div>
          <div className="mt-1 font-mono2 text-[10px] text-foreground/45">
            {hoverDist ? `${hoverDist.mean.toFixed(3)} from the plain prompt` : 'the plain prompt, the reference point'}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {hoverSeeds.map((seed) => (
              <ZoomImage
                key={seed}
                src={modelImg(model, hover.sit, hover.code, seed)}
                alt={`${hover.sit} ${hover.code} seed ${seed}`}
                caption={`“a ${hover.sit}${hover.code === 'default' ? '' : ` in ${C8[hover.code].name}`}” · ${MODEL_NAME[model]} · seed ${seed}`}
                imgClassName="aspect-square w-full cursor-zoom-in rounded-md border border-border object-cover"
              />
            ))}
          </div>
          <div className="mt-2 font-mono2 text-[9px] leading-4 text-foreground/35">
            hover a cell to load it here · hover one of these four to enlarge it
          </div>
        </div>
          {controls}
        </div>
      </div>
    </div>
  )
}

function Heatmap({ onSelect, ruler }: { onSelect: (s: Sit) => void; ruler: Ruler }) {
  const { model } = useModel()
  /* Colour is scaled inside each row, not against one page-wide maximum. On a
     shared scale the largest event (celebration) set the ceiling and the events
     with smaller spreads (funeral) read as uniformly pale, and the same happened
     to whole models when the reader switched to one with smaller distances. The
     printed numbers stay absolute, so cross-row comparison is still available. */
  const rowRange = useMemo(
    () =>
      Object.fromEntries(
        SITS.map((s) => {
          const vals = COUNTRY8.map((c) => distOrNull(model, s, c.id, ruler)?.mean ?? 0)
          return [s, { min: Math.min(...vals), max: Math.max(...vals) }]
        })
      ) as Record<Sit, { min: number; max: number }>,
    [model, ruler]
  )
  const [hover, setHover] = useState<{ sit: Sit; code: Code | 'default' }>({ sit: 'wedding', code: 'NG' })
  const previewDist = distOrNull(model, hover.sit, hover.code, ruler)
  const previewImgs = useMemo(
    () => modelSeeds(model, hover.sit, hover.code, 5),
    [model, hover.sit, hover.code]
  )
  const cv = hover.code === 'default' ? CV_DEFAULT : C8[hover.code].cv

  return (
    <div>
      <div>
        {/* capped and centred: on a full-width panel the nine columns stretched to
            ~90px against a 44px row height, which read as a smear rather than a
            grid. At this width the cells come out square. */}
        <div className="mx-auto max-w-[700px]">
          <div className="grid grid-cols-[86px_repeat(9,1fr)_86px] gap-1">
            <div />
            <div className="pb-1 text-center font-mono2 text-[10px] text-foreground/45">default</div>
            {COUNTRY8.map((c) => (
              <div key={c.id} className="pb-1 text-center font-mono2 text-[10px]" style={{ color: rgb(c.cv) }}>
                {c.id}
              </div>
            ))}
            <div className="pb-1 pl-1.5 font-mono2 text-[10px] text-foreground/45">this row</div>
            {SITS.map((sit) => (
              <Fragment key={sit}>
                <button
                  onClick={() => onSelect(sit)}
                  className="pr-2 text-right font-mono2 text-[11px] text-foreground/60 hover:text-amber-200"
                >
                  {sit}
                </button>
                {(['default',...COUNTRY8.map((c) => c.id)] as (Code | 'default')[]).map((code) => {
                  const d = distOrNull(model, sit, code, ruler)
                  const cvc = code === 'default' ? CV_DEFAULT : C8[code].cv
                  const v = d ? d.mean : 0
                  const rel = rowRange[sit].max ? v / rowRange[sit].max : 0
                  const active = hover.sit === sit && hover.code === code
                  return (
                    <button
                      key={`${sit}-${code}`}
                      onMouseEnter={() => setHover({ sit, code })}
                      onClick={() => onSelect(sit)}
                      className={`relative flex aspect-square items-center justify-center rounded font-mono2 text-[10px] transition-transform ${active ? 'z-10 scale-110 ring-1 ring-foreground/50' : ''}`}
                      style={{
                        background: code === 'default' ? rgba(CV_DEFAULT, 0.12) : rgba(cvc, 0.12 + 0.75 * rel),
                        color: rel > 0.62 ? '#0b0b10' : 'hsl(var(--foreground) / 0.75)',
                      }}
                      title={d ? `${sit} × ${code}: ${d.mean.toFixed(3)} [${d.ci_low.toFixed(3)}, ${d.ci_high.toFixed(3)}]` : 'the plain prompt, the reference point'}
                    >
                      {d ? d.mean.toFixed(2) : '·'}
                    </button>
                  )
                })}
                {/* the row's own endpoints, so the reader can see what the shading
                    in that row is scaled against instead of inferring it */}
                <div className="flex flex-col justify-center pl-1.5 font-mono2 text-[9px] leading-3 text-foreground/50">
                  <span>{rowRange[sit].min.toFixed(2)} palest</span>
                  <span className="text-foreground/75">{rowRange[sit].max.toFixed(2)} solid</span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5 border-t border-border pt-4">
        <div className="font-mono2 text-[11px] leading-5" style={{ color: rgb(cv) }}>
          “a {hover.sit}{hover.code === 'default' ? '' : ` in ${C8[hover.code].name}`}”
          {previewDist && (
            <span className="text-foreground/45">
              {' · '}{previewDist.mean.toFixed(3)} from the plain prompt
              {' · '}the true value very likely between {previewDist.ci_low.toFixed(2)} and {previewDist.ci_high.toFixed(2)}
            </span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-5 gap-2 sm:max-w-xl">
          {previewImgs.map((s) => (
            <ZoomImage
              key={s}
              src={modelImg(model, hover.sit, hover.code, s)}
              alt={`${hover.sit} ${hover.code} seed ${s}`}
              caption={`“a ${hover.sit}${hover.code === 'default' ? '' : ` in ${C8[hover.code].name}`}” · ${MODEL_NAME[model]} · seed ${s}`}
              imgClassName="aspect-square w-full cursor-zoom-in rounded-lg border border-border object-cover"
            />
          ))}
        </div>
        <p className="mt-2 font-mono2 text-[9px] leading-4 text-foreground/45">
          hover any cell above to load its images · hover an image to enlarge it · 5 seeds spread typical → outlier, of{' '}
          {seedCount(model)}
          <br />
          Colour is scaled inside each row: pale is 0 (identical to that row's plain prompt), solid is the largest
          distance in that row, printed in the last column. The numbers in the cells are absolute, so they stay
          comparable across rows even though the shading is not.
        </p>
      </div>
    </div>
  )
}

function DistanceBars({ situation, ruler }: { situation: Sit; ruler: Ruler }) {
  const { model } = useModel()
  const rows = COUNTRY8.map((c) => ({ ...c, d: dist(model, situation, c.id, ruler) }))
  return (
    <div className="space-y-3">
      {/* a named header for every column, so no number arrives unexplained */}
      <div className="flex items-end gap-3 border-b border-border pb-2">
        <span className="w-32 shrink-0" />
        <span className="flex-1 font-mono2 text-[10px] leading-4 text-foreground/45">
          how far “a {situation} in …” sits from plain “a {situation}”
          <br />
          <span className="text-foreground/30">the bracket is the range the true value very likely falls in</span>
        </span>
        <span className="w-14 shrink-0 text-right font-mono2 text-[10px] text-foreground/45">distance</span>
        {isSd21(model) && (
          <span className="w-28 shrink-0 font-mono2 text-[10px] leading-4 text-foreground/45">
            sorted back
            <br />
            <span className="text-foreground/30">50% = coin flip</span>
          </span>
        )}
      </div>
      {rows.map((r, i) => {
        const h = isSd21(model) ? HARDENING[key(situation, r.id)] : undefined
        return (
          <BarRow
            key={r.id}
            label={r.name}
            value={r.d.mean}
            ci={[r.d.ci_low, r.d.ci_high]}
            max={RULER_MAX[ruler].dist}
            color={r.cv}
            delay={i * 0.05}
            right={h ? `${Math.round(h.knn_auc * 100)}% correct` : undefined}
          />
        )
      })}
    </div>
  )
}

function NationalityScene() {
  const { model } = useModel()
  const [situation, setSituation] = useState<Sit>('wedding')
  const [ruler, setRuler] = useState<Ruler>('dinov3')
  const [roll, setRoll] = useState(0)
  const onSd21 = isSd21(model)
  const weddingUS = dist(model, 'wedding', 'US', ruler).mean
  const weddingNG = dist(model, 'wedding', 'NG', ruler).mean
  const aucs = COUNTRY8.map((c) => HARDENING[key(situation, c.id)]?.knn_auc).filter(Boolean) as number[]
  return (
    <SceneShell
      number="02"
      kicker="Part I · the default · finding 1"
      title={<>The default has a <em className="font-display italic text-amber-200">nationality.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          We generate <strong>“a wedding”</strong> 50 times, then <strong>“a wedding in Nigeria”</strong> 50 times, and
          measure how far apart the two sets of pictures sit. The pattern is consistent: <strong>the plain prompt and
          “in the USA” draw almost the same pictures</strong> ({weddingUS.toFixed(2)} apart), while Nigeria sits
          {' '}{weddingNG.toFixed(2)} away, most of the way to being a different event.
        </p>
      </Reveal>
      <Reveal delay={0.06}>
        <Panel className="mt-10">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            see the whole board · 54 cells, 4 of {seedCount(model)} seeds each, {roll === 0 ? 'typical → outlier' : 'random seeds'}
          </div>
          {!onSd21 && (
            <p className="mt-3 font-mono2 text-[10px] leading-4 text-foreground/50">
              Showing <span className="text-amber-200">{MODEL_NAME[model]}</span>: its own images, and every distance
              measured from <em>its own</em> plain prompt rather than SD 2.1's, under whichever measuring stick is
              selected. All 50 seeds go into the statistics; {seedCount(model)} of them are published as thumbnails
              here, against SD 2.1's fifty.
            </p>
          )}
          <div className="mt-6">
            <MosaicWall
              onSelect={setSituation}
              ruler={ruler}
              roll={roll}
              controls={
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/70 p-3">
                  <MetricToggle value={ruler} onChange={setRuler} showLabel={false} />
                  <button onClick={() => setRoll((r) => r + 1)} className="chip !px-2.5 !py-1">
                    ⚄ roll other seeds
                  </button>
                  {roll > 0 && (
                    <button onClick={() => setRoll(0)} className="chip !px-2.5 !py-1">
                      typical → outlier
                    </button>
                  )}
                </div>
              }
            />
          </div>
        </Panel>
      </Reveal>
      <Reveal delay={0.07}>
        <div className="mt-6">
          <DistanceRuler />
        </div>
      </Reveal>
      <Reveal delay={0.08}>
        <Panel className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
              the same 54 cells as numbers · distance from each row's plain prompt
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <MetricToggle value={ruler} onChange={setRuler} />
              <Legend withDefault={false} />
            </div>
          </div>
          <div className="mt-6">
            <Heatmap onSelect={setSituation} ruler={ruler} />
          </div>
        </Panel>
      </Reveal>
      <Reveal delay={0.1}>
        <Panel className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
              one situation at a time, with its uncertainty
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <BoxPicker label="event" value={situation} onChange={setSituation} options={SIT_OPTS} size="sm" />
              <MetricToggle value={ruler} onChange={setRuler} />
            </div>
          </div>
          <div className="mt-8">
            <DistanceBars situation={situation} ruler={ruler} />
          </div>
          <div className="mt-6 grid gap-4 border-t border-border pt-5 md:grid-cols-2">
            {onSd21 ? <KnnNote /> : (
              <p className="text-sm leading-6 text-foreground/60">
                The per-cell sorting test is reported for Stable Diffusion 2.1 here. {MODEL_NAME[model]}'s own gaps
                were permutation-tested too — 286 of 288 model × cell combinations clear p &lt; 0.05, which Part VII
                reports in full — so what is missing on this chart is the per-cell figure, not the testing.
              </p>
            )}
            <div className="space-y-3">
              <p className="text-sm leading-6 text-foreground/60">
                {situation === 'wedding' || situation === 'funeral'
                  ? `“A ${situation}” is the clearest case: the US variant barely moves the pictures, while India and Nigeria sit roughly half the scale away.`
                  : situation === 'school' || situation === 'celebration'
                    ? `“A ${situation}” looks weaker on this chart, yet the classifier still separates plain from country about 97% of the time. Diffuse is not the same as absent.`
                    : `The gradient holds for “a ${situation}”: near-default countries cluster tightly, distant countries sit apart.`}
              </p>
              <TierNote
                tier="evidence"
                text={`For “a ${situation}” the classifier scores ${Math.round(Math.min(...aucs) * 100)}–${Math.round(Math.max(...aucs) * 100)}% across the eight countries. Every gap here also clears p < 0.0001 in a 10,000-shuffle permutation test: we relabelled the images at random ten thousand times, and no random relabelling ever produced a gap this size. The same gradient reproduces under a completely different image model: switch the ruler above from DINOv3 to CLIP and the ordering survives.`}
              />
            </div>
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Scene 3 · the zero point (F2) ───────────────────────────────────────── */

/* Every one of the 54 cells placed on two axes at once: how far it sits from the
   empty prompt, and how far it sits from its own situation's plain prompt. If the
   empty prompt were culturally neutral the cloud would be a vertical smear. It is
   a diagonal: whatever the plain prompt is close to, the empty prompt is close to
   as well, and both are close to the West. */
/* One row per prompt: distance from the empty prompt, distance from that event's
   own plain prompt. SD 2.1 has all 54 cells (its export includes the plain prompts
   themselves); the three cross-models that were run with prompt="" have the 48
   country cells. */
export interface EmptyPoint { sit: Sit; code: Code | 'default'; d_empty: number; d_default: number }

function EmptyScatter({ pts, hover, setHover, focus }: {
  pts: EmptyPoint[]
  hover: { sit: Sit; code: Code | 'default' }
  setHover: (h: { sit: Sit; code: Code | 'default' }) => void
  focus: Focus
}) {
  const W = 760
  const H = 430
  const padL = 46
  const padB = 44
  const padT = 14
  const padR = 20
  /* the axes follow the data: the cross-models sit on quite different scales from
     SD 2.1, and a fixed window put half of Kolors off the plot */
  const [x0, x1, y0, y1] = useMemo(() => {
    const xs = pts.map((p) => p.d_empty)
    const ys = pts.map((p) => p.d_default)
    const pad = (lo: number, hi: number) => [lo - (hi - lo) * 0.08, hi + (hi - lo) * 0.08] as const
    const [xa, xb] = pad(Math.min(...xs), Math.max(...xs))
    const [ya, yb] = pad(Math.min(...ys), Math.max(...ys))
    return [xa, xb, ya, yb]
  }, [pts])
  const X = (v: number) => padL + ((v - x0) / (x1 - x0)) * (W - padL - padR)
  const Y = (v: number) => H - padB - ((v - y0) / (y1 - y0)) * (H - padT - padB)
  const tick = (lo: number, hi: number) => [0.2, 0.45, 0.7, 0.95].map((f) => lo + f * (hi - lo))

  const meanByCountry = useMemo(() => {
    const m = new Map<Code | 'default', { x: number; y: number; n: number }>()
    pts.forEach((p) => {
      const cur = m.get(p.code) ?? { x: 0, y: 0, n: 0 }
      m.set(p.code, { x: cur.x + p.d_empty, y: cur.y + p.d_default, n: cur.n + 1 })
    })
    return [...m.entries()].map(([code, v]) => ({ code, x: v.x / v.n, y: v.y / v.n }))
  }, [pts])

  // the pointer snaps to the nearest prompt rather than having to land on it
  const magnet = useMagnet(
    pts.map((p) => ({ x: X(p.d_empty), y: Y(p.d_default), item: p })),
    (p) => p && setHover({ sit: p.sit, code: p.code })
  )
  const active = pts.find((p) => p.sit === hover.sit && p.code === hover.code)

  return (
    <div className="mx-auto max-w-3xl">
      {/* axis titles live outside the drawing, where nothing can collide with them */}
      <div className="mb-1 font-mono2 text-[10px] text-foreground/45">
        ↑ how far the prompt sits from its own plain prompt
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair" {...magnet}>
        {tick(x0, x1).map((v) => (
          <g key={`x${v}`}>
            <line x1={X(v)} x2={X(v)} y1={padT} y2={H - padB} stroke="hsl(var(--grid))" strokeDasharray="3 5" />
            <text x={X(v)} y={H - padB + 15} textAnchor="middle" fontSize="10" fill="hsl(var(--svg-fg))" fontFamily="JetBrains Mono">{v.toFixed(2)}</text>
          </g>
        ))}
        {tick(y0, y1).map((v) => (
          <g key={`y${v}`}>
            <line x1={padL} x2={W - padR} y1={Y(v)} y2={Y(v)} stroke="hsl(var(--grid))" strokeDasharray="3 5" />
            <text x={padL - 8} y={Y(v) + 3} textAnchor="end" fontSize="10" fill="hsl(var(--svg-fg))" fontFamily="JetBrains Mono">{v.toFixed(2)}</text>
          </g>
        ))}

        {/* the snapped point gets a crosshair so the magnet is legible */}
        {active && (
          <g pointerEvents="none">
            <line x1={padL} x2={W - padR} y1={Y(active.d_default)} y2={Y(active.d_default)} stroke="hsl(var(--foreground) / 0.18)" />
            <line x1={X(active.d_empty)} x2={X(active.d_empty)} y1={padT} y2={H - padB} stroke="hsl(var(--foreground) / 0.18)" />
          </g>
        )}

        {pts.map((p) => {
          const cv = p.code === 'default' ? CV_DEFAULT : C8[p.code].cv
          const on = hover.sit === p.sit && hover.code === p.code
          const dim = focus != null && focus !== p.code
          return (
            <circle
              key={`${p.sit}_${p.code}`}
              cx={X(p.d_empty)}
              cy={Y(p.d_default)}
              r={on ? 7 : dim ? 3 : 4.5}
              fill={rgb(cv)}
              fillOpacity={dim ? 0.12 : on ? 1 : 0.45}
              stroke={on ? 'white' : 'none'}
              pointerEvents="none"
            />
          )
        })}
        {meanByCountry.map((m) => {
          const cv = m.code === 'default' ? CV_DEFAULT : C8[m.code].cv
          const low = Y(m.y) > H - padB - 40
          const dim = focus != null && focus !== m.code
          return (
            <g key={`m${m.code}`} pointerEvents="none" opacity={dim ? 0.18 : 1}>
              <circle cx={X(m.x)} cy={Y(m.y)} r={10} fill="none" stroke={rgb(cv)} strokeWidth={2.5} />
              <text
                x={X(m.x)}
                y={low ? Y(m.y) - 15 : Y(m.y) + 22}
                textAnchor="middle"
                fontSize="10"
                fill={rgb(cv)}
                fontFamily="JetBrains Mono"
              >
                {m.code === 'default' ? 'default' : m.code}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-1 text-right font-mono2 text-[10px] text-foreground/45">
        how far the prompt sits from the empty prompt →
      </div>
    </div>
  )
}

function ZeroPointScene() {
  const { model } = useModel()
  const [hover, setHover] = useState<{ sit: Sit; code: Code | 'default' }>({ sit: 'wedding', code: 'NG' })
  const [focus, setFocus] = useState<Focus>(null)
  const [ruler, setRuler] = useState<Ruler>('dinov3')
  /* All seven models were generated with prompt="" (SDXL, Hunyuan-DiT and Flux
     joined 2026-07-30), so every model answers the switcher with its own 30
     images and its own 54 cells. The SD 2.1 fallback below stays as the honest
     behaviour if a model's empty run is ever missing from the export. */
  const own = emptyFor(model, ruler)
  const usingSd21 = own === null
  const src = own ?? emptyFor('sd21', ruler)!
  const pts: EmptyPoint[] = useMemo(
    () => src.rows.map((r) => ({ sit: r.sit as Sit, code: r.code as Code | 'default', d_empty: r.d_empty, d_default: r.d_default })),
    [src]
  )
  const point = pts.find((p) => p.sit === hover.sit && p.code === hover.code)
  const seeds = cell(hover.sit, hover.code).typical_order
  const cv = hover.code === 'default' ? CV_DEFAULT : C8[hover.code].cv
  const avg = (a: EmptyPoint[]) => a.reduce((s, p) => s + p.d_empty, 0) / a.length
  /* the ranking is derived rather than typed, so the named countries and the
     ratio can never drift from the export the chart below is drawn from */
  const ranked = COUNTRY8.map((c) => ({ id: c.id, name: c.name, d: avg(pts.filter((p) => p.code === c.id)) })).sort(
    (a, b) => a.d - b.d
  )
  const nearest = ranked.slice(0, 3)
  const farthest = ranked.slice(-2).reverse()
  /* The near/far ends and the ratio between them are both read off the ranking,
     so no country is named that the selected model's own numbers didn't put there.
     The old prose fixed them as US/Germany against Nigeria/India — SD 2.1's answer,
     and wrong on Qwen-Image, whose empty prompt sits farther from the US than from
     anywhere except Nigeria. */
  const dNear = (nearest[0].d + nearest[1].d) / 2
  const dFar = (farthest[0].d + farthest[1].d) / 2
  const ratio = dFar / dNear
  const tied = nearest[2].d - nearest[0].d < 0.02
  /* "Western-leaning" is a claim about which end is which, not just that the ends
     differ. It holds where the US or Germany is in the nearest *pair* — the same
     pair the ratio is computed from — and the spread is more than noise. Under
     DINOv3 that is SD 2.1, SDXL and Kolors; Qwen-Image's nearest pair is Japan and
     Indonesia, and its empty prompt sits farther from the US than from anywhere
     but Nigeria, so the old title was simply false there. */
  const westLean = ratio >= 1.15 && nearest.slice(0, 2).some((c) => c.id === 'US' || c.id === 'DE')
  const shownModel = usingSd21 ? 'sd21' : model
  /* SD 2.1's diagonal is not a law: the same Spearman run gives 0.29 on Kolors,
     0.19 (not significant) on Qwen-Image and −0.42 on SD 3.5 Large. So the
     sentence under the scatter reads the selected model's own fit instead of
     asserting the shape. Always the DINOv3 figure over the 48 country cells —
     that is what the published analysis computed, on either ruler setting. */
  const fitLine = (() => {
    const f = src.fit
    if (!f) return null
    const r = `ρ = ${f.rho.toFixed(2)}, ${f.p < 0.001 ? 'p < 0.001' : `p = ${f.p.toFixed(3)}`} over ${f.n} country cells (DINOv3)`
    if (f.p >= 0.05)
      return (
        <>
          {' '}It does not, but neither does it tilt: <strong>far-from-plain and far-from-empty are unrelated here</strong>{' '}
          ({r}). The situation word is doing cultural work of its own, beyond what the bare prior already carries.
        </>
      )
    if (f.rho < 0)
      return (
        <>
          {' '}It tilts, but <strong>the other way</strong> ({r}): the prompts sitting farthest from this model's plain
          prompt are the ones sitting <em>closest</em> to its empty one. The SD 2.1 result does not replicate here.
        </>
      )
    if (f.rho < 0.5)
      return (
        <>
          {' '}It tilts the expected way but <strong>only weakly</strong> ({r}) — a real relationship, far short of SD
          2.1's, so the situation word still adds cultural location of its own.
        </>
      )
    return (
      <>
        {' '}Instead it runs diagonally: <strong>the prompts that are far from the plain prompt are exactly the prompts
        that are far from the empty one</strong> ({r}).
      </>
    )
  })()
  return (
    <SceneShell
      number="03"
      kicker="Part I · the default · finding 2"
      title={
        westLean ? (
          <>Even <em className="font-display italic text-amber-200">no prompt at all</em> is Western-leaning.</>
        ) : (
          <>Even <em className="font-display italic text-amber-200">no prompt at all</em> is already somewhere.</>
        )
      }
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          We generated <strong>30 images from an empty prompt</strong>, the model with nothing asked of it at all, on the
          same fixed seeds as every other prompt on this page (0–29 of the same 50), at the same 30 steps and the same
          resolution.{' '}
          {ratio >= 1.15 ? (
            <>
              Those 30 images do not land in the middle of the eight countries. They land{' '}
              <strong>
                closest to {nearest[0].name}, {nearest[1].name} and {nearest[2].name}
              </strong>
              {tied && ' — those three are effectively tied — '}
              {!tied && ' '}and{' '}
              <strong>
                farthest from {farthest[0].name} and {farthest[1].name}
              </strong>
              , roughly <strong>{ratio.toFixed(1)}× further</strong>. Averaged over all six events:{' '}
              {dFar.toFixed(2)} away from the {farthest[1].name} and {farthest[0].name} pictures against{' '}
              {dNear.toFixed(2)} from the {nearest[0].name} and {nearest[1].name} ones.
            </>
          ) : (
            <>
              Here the 30 images land <strong>almost equidistant from all eight countries</strong> —{' '}
              {dNear.toFixed(2)} at the near end ({nearest[0].name}, {nearest[1].name}) against {dFar.toFixed(2)} at
              the far end ({farthest[1].name}, {farthest[0].name}), a spread of only{' '}
              <strong>{ratio.toFixed(2)}×</strong>. This model's empty prompt has a location, but it is not one of the
              eight; on {MODEL_NAME.sd21} the same measurement gives 1.5×, with the US and Germany at the near end.
            </>
          )}{' '}
          Before a single word is typed, the model is already somewhere.
        </p>
      </Reveal>

      <Reveal delay={0.06}>
        <Panel className="mt-10">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            what “” draws · 12 of the 30 empty-prompt images · {MODEL_NAME[shownModel]}
          </div>
          {!isSd21(model) && (
            <p className={`mt-3 rounded-md border px-3 py-2 font-mono2 text-[10px] leading-4 ${own ? 'border-border bg-foreground/[0.04] text-foreground/70' : 'border-amber-300/30 bg-amber-300/5 text-amber-700 dark:text-amber-200/90'}`}>
              {own
                ? `${MODEL_NAME[model]} was run with an empty prompt too, so this whole scene is its own: its 30 images and its own 54 cells below.`
                : `${MODEL_NAME[model]} was never generated with an empty prompt, so this scene stays on Stable Diffusion 2.1 rather than substituting a number it does not have.`}
            </p>
          )}
          <div className="mt-5 grid grid-cols-6 gap-2">
            {Array.from({ length: 12 }, (_, i) => emptyImg(shownModel, i)).map((src, i) => (
              <ZoomImage
                key={src}
                src={src}
                alt="empty-prompt generation"
                caption={`the empty prompt “” · ${MODEL_NAME[shownModel]} · image ${i + 1} of 30`}
                imgClassName="aspect-square w-full cursor-zoom-in rounded-lg border border-border object-cover"
              />
            ))}
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-foreground/60">
            Mundane, Western-coded stock-photo interiors and objects. Note carefully what the evidence is and is not:
            a vision-language model looking at these pictures <em>cannot</em> reliably name the lean. The lean is
            geometric, it lives in the measurement below, and we state it exactly that way.
          </p>
        </Panel>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
              all {pts.length} cells, measured against two reference points at once
            </div>
            <MetricToggle value={ruler} onChange={setRuler} />
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/60">
            Each small dot is one prompt: “a wedding in Nigeria”, “a breakfast in Japan”, and so on. Its horizontal
            position is how far that prompt's pictures sit from the empty prompt. Its vertical position is how far they
            sit from the same event's plain prompt. The ringed markers are the eight country averages across all six
            events. If the empty prompt had no cultural location the cloud would be a vertical smear at one x value.
            {fitLine}
          </p>
          <div className="mt-6">
            <EmptyScatter pts={pts} hover={hover} setHover={setHover} focus={focus} />
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <div className="grid gap-6 md:grid-cols-[300px_1fr]">
              <div className="rounded-lg border border-border p-3">
                <div className="font-mono2 text-[11px]" style={{ color: rgb(cv) }}>
                  “a {hover.sit}{hover.code === 'default' ? '' : ` in ${C8[hover.code].name}`}”
                </div>
                {point && (
                  <div className="mt-1 font-mono2 text-[10px] leading-4 text-foreground/45">
                    {point.d_empty.toFixed(2)} from the empty prompt · {point.d_default.toFixed(2)} from “a {hover.sit}”
                  </div>
                )}
                {/* the prompted pictures exist for every model, empty run or not, so
                    these stay on the model you selected even when the chart above has
                    to fall back — a missing empty prompt is no reason to hide Flux's
                    own weddings. */}
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {(isSd21(model) ? [seeds[0], seeds[24], seeds[49]] : modelSeeds(model, hover.sit, hover.code, 3)).map((s) => (
                    <ZoomImage
                      key={s}
                      src={modelImg(model, hover.sit, hover.code, s)}
                      alt={`${hover.sit} ${hover.code} seed ${s}`}
                      caption={`“a ${hover.sit}${hover.code === 'default' ? '' : ` in ${C8[hover.code].name}`}” · ${MODEL_NAME[model]} · seed ${s}`}
                      imgClassName="aspect-square w-full cursor-zoom-in rounded-md border border-border object-cover"
                    />
                  ))}
                </div>
                <p className="mt-2 font-mono2 text-[9px] text-foreground/35">
                  hover any dot to load its images here · {MODEL_NAME[model]}
                  {usingSd21 && ', measured on Stable Diffusion 2.1'}
                </p>
              </div>
              <div className="flex flex-col justify-between gap-5">
                <Legend focus={focus} onFocus={setFocus} />
                <p className="font-display border-l-2 border-amber-300/50 pl-4 text-lg leading-7 text-foreground/85 italic">
                  {src.fit && src.fit.rho > 0.5 && src.fit.p < 0.05
                    ? 'The default is not an answer the model gives. It is the state the model is already in.'
                    : 'The empty prompt is already somewhere. On this model it is not the same somewhere its plain prompts go.'}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 border-t border-border pt-4">
            <TierNote
              tier="evidence"
              text="30 empty-prompt images, generated at each model's own guidance scale (7.5 for Stable Diffusion 2.1) rather than at CFG 0 — CFG 0 only runs the unconditional pass and never samples the conditioned prior. Horizontal axis: distance from the empty-prompt centroid to each variant's centroid, with bootstrap confidence intervals. Vertical axis: the same measurement against each situation's own plain prompt."
            />
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Scene 4 · seed by seed (F3) ─────────────────────────────────────────── */

function SeedBySeedScene() {
  const [situation, setSituation] = useState<Sit>('wedding')
  const labels = F3[situation]
  const counts = useMemo(() => {
    const m = new Map<Code | 'default', number>()
    labels.forEach((l) => m.set(l, (m.get(l) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [labels])
  const southHere = labels.filter((l) => SOUTH.includes(l)).length

  return (
    <SceneShell
      number="04"
      kicker="Part I · the default · finding 3"
      title={<>Not an average, <em className="font-display italic text-amber-200">seed by seed.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          A mean could hide a mixture: maybe half the default seeds are Western and half are not, cancelling out. They
          are not. For every default seed we ask which country's cluster it lies closest to. Across all 300 default
          seeds, only <strong>{F3_SOUTH_COUNT} ({(100 * F3_SOUTH_COUNT / F3_TOTAL).toFixed(1)}%) land nearest India,
          Nigeria, Indonesia or Egypt</strong>. The rest land nearest the US, Germany, or the mid-band countries
          Russia and Japan.
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
              50 default seeds of “a {situation}” · underline = nearest country cluster
            </div>
            <BoxPicker label="event" value={situation} onChange={setSituation} options={SIT_OPTS} size="sm" />
          </div>
          {/* 5 rows of 10: the 50 seeds are a fixed set, so a fixed grid lets the
              reader count them and compare row to row instead of reflowing */}
          <div className="mt-6 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
            {labels.map((l, seed) => (
              <span key={seed} className="relative block">
                <ZoomImage
                  src={seedImg(situation, 'default', seed)}
                  alt={`${situation} default seed ${seed}`}
                  caption={`“a ${situation}” · seed ${seed} · nearest country cluster: ${C8[l].name}`}
                  imgClassName="aspect-square w-full cursor-zoom-in rounded-md border border-border object-cover"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 rounded-b-md" style={{ background: rgb(C8[l].cv) }} />
              </span>
            ))}
          </div>
          <div className="mt-6 grid gap-4 border-t border-border pt-5 md:grid-cols-2">
            <div>
              <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">nearest-cluster tally · {situation}</div>
              <div className="mt-3 space-y-1.5">
                {counts.map(([code, n]) => (
                  <div key={code} className="flex items-center gap-2">
                    <span className="w-6 font-mono2 text-[10px]" style={{ color: rgb(C8[code as Code].cv) }}>{code}</span>
                    <div className="relative h-3 flex-1 rounded-sm bg-foreground/5">
                      <div className="absolute inset-y-0 left-0 rounded-sm" style={{ width: `${(n / 50) * 100}%`, background: rgb(C8[code as Code].cv) }} />
                    </div>
                    <span className="w-8 text-right font-mono2 text-[10px] text-foreground/50">{n}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 font-mono2 text-[10px] leading-4 text-foreground/40">
                {southHere} of these 50 seeds land nearest a Global-South country (IN/NG/ID/EG)
              </p>
            </div>
            <div className="flex flex-col justify-between gap-4">
              <Legend withDefault={false} />
              <TierNote
                tier="evidence"
                text="Every one of the 50 plain-prompt seeds was assigned to whichever country's set of pictures it sits closest to, one seed at a time. The Western default is a property of individual images, not something that only appears once you average them."
              />
            </div>
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Scene 5 · the map is real (F4 + F5) ─────────────────────────────────── */

function UmapScatter({ situation, focus, ruler, compact = false }: {
  situation: Sit
  focus?: Focus
  ruler: Ruler
  /* compact = just the plot, for the six-up board; no inspector, no side panel */
  compact?: boolean
}) {
  const { model } = useModel()
  const [hover, setHover] = useState<{ code: Code | 'default'; seed: number } | null>(null)
  /* Tier C: every model has its own fit now, one per (model, situation), all nine
     variants projected together so the clouds stay comparable inside a plot.
     Coordinates arrive already normalised to 0..1 by the exporter. */
  const data = umapFor(model, situation, ruler)
  const W = 640
  const H = 420
  const pad = 26
  const X = (x: number) => pad + x * (W - 2 * pad)
  const Y = (y: number) => H - pad - y * (H - 2 * pad)

  const magnet = useMagnet(
    (data?.points ?? []).map((p) => ({ x: X(p.xy[0]), y: Y(p.xy[1]), item: p })),
    (p) => p && setHover({ code: p.c as Code | 'default', seed: p.s })
  )

  if (!data) return null

  const plot = (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair" {...(compact ? {} : magnet)}>
        {data.points.map((p, i) => {
          const code = p.c as Code | 'default'
          const cv = code === 'default' ? CV_DEFAULT : C8[code].cv
          const on = hover?.seed === p.s && hover?.code === code
          const dim = focus != null && focus !== code
          return (
            <circle
              key={i}
              cx={X(p.xy[0])}
              cy={Y(p.xy[1])}
              r={on ? 7 : compact ? 3 : 4}
              fill={rgb(cv)}
              fillOpacity={dim ? 0.1 : code === 'default' ? 0.9 : 0.65}
              stroke={on ? 'white' : 'none'}
              pointerEvents="none"
              className="transition-all"
            />
          )
        })}
        {Object.entries(data.centroids).map(([name, c]) => {
          const code = name as Code | 'default'
          const cv = code === 'default' ? CV_DEFAULT : C8[code].cv
          const dim = focus != null && focus !== code
          return (
            <g key={name} opacity={dim ? 0.15 : 1}>
              <circle cx={X(c[0])} cy={Y(c[1])} r={compact ? 6 : 8} fill="none" stroke={rgb(cv)} strokeWidth={2} />
              {!compact && (
                <text x={X(c[0])} y={Y(c[1]) - 12} textAnchor="middle" fontSize="9" fill={rgb(cv)} fontFamily="JetBrains Mono">
                  {name === 'default' ? 'default' : code}
                </text>
              )}
            </g>
          )
        })}
      </svg>
  )

  if (compact) return plot

  return (
    <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
      {plot}
      <div className="flex flex-col gap-4">
        <div className="flex min-h-[120px] items-center gap-4 rounded-lg border border-border p-3">
          {hover ? (
            <>
              <ZoomImage
                src={modelImg(model, situation, hover.code, hover.seed)}
                alt={`${situation} ${hover.code} seed ${hover.seed}`}
                caption={`“a ${situation}${hover.code === 'default' ? '' : ` in ${C8[hover.code].name}`}” · ${MODEL_NAME[model]} · seed ${hover.seed}`}
                imgClassName="h-24 w-24 cursor-zoom-in rounded-lg border border-border object-cover"
              />
              <div className="font-mono2 text-[11px] leading-5 text-foreground/55">
                <span style={{ color: rgb(hover.code === 'default' ? CV_DEFAULT : C8[hover.code].cv) }}>
                  {hover.code === 'default' ? 'default' : C8[hover.code].name}
                </span>
                {' · '}seed {hover.seed}
                <br />a {situation}
              </div>
            </>
          ) : (
            <p className="p-2 font-mono2 text-[11px] text-foreground/35">hover any point to see the image it represents</p>
          )}
        </div>
        <div className="rounded-lg border border-sky-300/25 bg-sky-300/5 p-4">
          <div className="font-mono2 text-[10px] tracking-widest text-sky-300/80 uppercase">finding 5 · it genuinely clusters</div>
          <p className="mt-2 text-sm leading-6 text-foreground/70">
            Grouping images by country label gives silhouette scores of{' '}
            <strong className="text-foreground">
              {SILHOUETTE_RANGE[0].toFixed(2)}–{SILHOUETTE_RANGE[1].toFixed(2)}
            </strong>{' '}
            across situations, so the clustering is statistically real, not a projection artifact.
          </p>
        </div>
      </div>
    </div>
  )
}

function MapScene() {
  const [situation, setSituation] = useState<Sit>('wedding')
  const [focus, setFocus] = useState<Focus>(null)
  const [board, setBoard] = useState(false)
  /* the projection is refitted on whichever embedding space is selected — the same
     question the distance charts answer with their own toggle, asked of the map */
  const [ruler, setRuler] = useState<Ruler>('dinov3')
  return (
    <SceneShell
      number="05"
      kicker="Part I · the default · finding 4"
      title={<>The map is <em className="font-display italic text-amber-200">real.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          Flatten the embedding space to two dimensions and the structure is visible to the naked eye: defaults and
          near-default countries overlap, distant countries drift apart, and non-Western countries are pulled toward{' '}
          <strong>shared attractors</strong> (Nigeria's nearest cluster is India in 4–5 of 6 situations), not toward
          their own faithful depictions.
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
UMAP of real {ruler === 'dinov3' ? 'DINOv3' : 'CLIP'} embeddings · {board ? 'all six events' : situation} · rings = true centroids
            </div>
            <div className="flex flex-wrap items-end gap-3">
            <MetricToggle value={ruler} onChange={setRuler} showLabel={false} />
            <button
              onClick={() => setBoard(!board)}
              className={`rounded-md border px-2.5 py-1 font-mono2 text-[11px] transition ${board ? 'border-amber-300/60 bg-amber-300/10 text-amber-200' : 'border-border text-foreground/50 hover:border-foreground/40 hover:text-foreground/80'}`}
            >
              {board ? '← back to one event' : 'see all six at once →'}
            </button>
            </div>
          </div>
          {/* one event large, or all six small: the six-up view is where "Nigeria
              lands next to India" stops being a claim about one plot */}
          {board ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SITS.map((s2) => (
                <button key={s2} onClick={() => { setSituation(s2); setBoard(false) }} className="rounded-lg border border-border p-2 text-left transition hover:border-foreground/40">
                  <div className="font-mono2 text-[10px] text-foreground/55">a {s2}</div>
                  <UmapScatter situation={s2} focus={focus} ruler={ruler} compact />
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="mt-4">
                <BoxPicker label="event" value={situation} onChange={setSituation} options={SIT_OPTS} size="sm" />
              </div>
              <div className="mt-6">
                <UmapScatter situation={situation} focus={focus} ruler={ruler} />
              </div>
            </>
          )}
          <div className="mt-6 grid gap-4 border-t border-border pt-5 md:grid-cols-2">
            <Legend focus={focus} onFocus={setFocus} />
            <TierNote
              tier="evidence"
              text="30 sampled images per prompt, with each prompt's true centre marked. Every pairwise country gap carries a bootstrap confidence interval, and the clustering scores are reported across all six events, not just the clearest one."
            />
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Part I ──────────────────────────────────────────────────────────────── */

export default function Part1Default() {
  return (
    <>
      <UnsaidScene />
      <NationalityScene />
      <ZeroPointScene />
      <SeedBySeedScene />
      <MapScene />
    </>
  )
}
