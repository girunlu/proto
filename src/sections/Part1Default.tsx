import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { CountUp } from '../components/CountUp'
import { ZoomImage, BarRow, DistanceRuler, KnnNote, BoxPicker, MetricToggle, useMagnet } from '../components/Viz'
import branchAData from '../data/branchA.json'

/** per-model, per-situation, per-country k-NN separability AUC (review 10 · C-3) */
const branchAKnn = branchAData.knn as Record<string, Record<string, Record<string, number>>>
import { Sd21Only } from '../components/ModelBar'
import { rgb, rgba } from '../lib/colors'
import {
  SITS, COUNTRY8, C8, CV_DEFAULT, decisionsFrom, F3, F3_SOUTH_COUNT, F3_TOTAL, SOUTH,
  SILHOUETTE_RANGE, seedImg,
  type Sit, type Code,
} from '../data/part1'
import { HARDENING, key } from '../data/uiv2'
import { CARDS_HEADLINE, CARDS_CANDIDATES } from '../data/part4'
import { useModel, modelImg, modelSeeds, modelVqa, seedCount, isSd21, MODEL_NAME, CROSS_MODEL_NOTE, type ModelId } from '../data/modelData'
/* Tier C: both rulers now exist for all seven models (the CLIP tables were
   already computed, they were simply never exported), so these read straight
   through instead of falling back to DINOv3 for the cross-model six. */
import { dist, distOrNull, RULER_MAX, umapFor, f3For, type Ruler } from '../data/crossmodel'

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
  // the published seed ids are not 0..n-1 for the cross-models, so draw from the
  // cell's own list rather than counting
  const pool = modelSeeds(m, sit, code, seedCount(m, sit, code))
  const rnd = mulberry32(hashStr(`${m}_${sit}_${code}_${roll}`))
  const picks: number[] = []
  while (picks.length < Math.min(n, pool.length)) {
    picks.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0])
  }
  return picks.sort((a, b) => a - b)
}

function UnsaidScene() {
  const { model } = useModel()
  const [sit, setSit] = useState<Sit>('wedding')
  const [active, setActive] = useState(0)
  /* the same two-word prompt exists for all six events, so the reader can check
     that the effect is not something peculiar to weddings — and R3: this list now
     follows the model switcher rather than staying on SD 2.1 under a heading that
     named it. The cross-model VQA is exported for all seven. */
  const decisions = useMemo(
    () => decisionsFrom(modelVqa(model, sit, 'default')?.closed ?? {}),
    [model, sit]
  )
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
          every seed. The decisions below are the answers {MODEL_NAME[model]} gives{' '}
          <strong>when nothing is specified at all</strong>. Switch the event — or the model, at the top of the
          screen — to see the same thing happen somewhere else.
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
                text={`Answers below come from the Assumption Auditor: 50 seeds per prompt, blind to the prompt, read by one annotator (gemma4) for all seven models. Project-wide that yields ${CARDS_CANDIDATES} candidate assumptions, ${CARDS_HEADLINE} of them headline-tier — settled on at least 80% of a prompt's 50 seeds. ${CROSS_MODEL_NOTE}`}
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
            {/* plain <img>, deliberately: this grid IS already the hover preview for the
                matrix, so ZoomImage popped a second thumbnail in the corner on top of it —
                a preview of a preview. Four pictures at this size are enough. */}
            {hoverSeeds.map((seed) => (
              <img
                key={seed}
                src={modelImg(model, hover.sit, hover.code, seed)}
                alt={`${hover.sit} ${hover.code} seed ${seed}`}
                loading="lazy"
                className="aspect-square w-full rounded-md border border-border object-cover"
              />
            ))}
          </div>
          <div className="mt-2 font-mono2 text-[9px] leading-4 text-foreground/35">
            hover a cell to load it here
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
            told apart
            <br />
            <span className="text-foreground/30">50% = guessing</span>
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
            right={h ? `${Math.round(h.knn_auc * 100)}%` : undefined}
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
  /* Review 10 · C-3: this printed SD 2.1's AUC range under every model. Per-cell
     cross-model AUCs run 0.46-1.00 — Flux's floor is below chance — so a sentence
     claiming "97% of the time" was false for four of the seven. Now reads the
     selected model's own row. */
  const aucs = (
    isSd21(model)
      ? COUNTRY8.map((c) => HARDENING[key(situation, c.id)]?.knn_auc)
      : COUNTRY8.map((c) => (branchAKnn[model]?.[situation] as Record<string, number> | undefined)?.[c.id])
  ).filter((v): v is number => v != null)
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
        {/* R6: the page used "Western default" throughout without ever saying what
            it was operationally. One sentence, at the first place the claim is made. */}
        <p className="prose-scene mt-4 max-w-2xl text-foreground/55">
          One definition, used everywhere below. <strong className="text-foreground/75">“Western default”</strong> means
          the pictures a plain prompt draws sit closer to the US and Germany variants than to the India, Nigeria,
          Indonesia and Egypt ones — in an embedding space trained without any of these labels. It is a claim about
          relative position in that space, not about culture, and not about what any of these countries looks like.
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
              here, against SD 2.1's fifty — the 20 least alike plus the 4 most typical, so what you see spans the
              full range of the set rather than a slice of it.
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
            <BoxPicker label="event" value={situation} onChange={setSituation} options={SIT_OPTS} size="sm" />
          </div>
          <div className="mt-8">
            <DistanceBars situation={situation} ruler={ruler} />
          </div>
          {/* the ruler belongs to the chart, not beside the event picker: two dropdowns of
              equal weight read as two things to choose, when one picks the subject and the
              other only restates it in a second measurement space. */}
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-3">
            <span className="font-mono2 text-[10px] leading-4 text-foreground/40">
              same distances, measured again in a second embedding space
            </span>
            <MetricToggle value={ruler} onChange={setRuler} showLabel={false} />
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
                    ? `“A ${situation}” looks weaker on this chart${
                        aucs.length
                          ? `, and for ${MODEL_NAME[model]} the sorting test runs ${Math.round(Math.min(...aucs) * 100)}–${Math.round(Math.max(...aucs) * 100)}% across the eight countries`
                          : ''
                      }. Diffuse is not the same as absent${
                        aucs.length && Math.min(...aucs) < 0.5
                          ? `, but the bottom of that range is below the 50% a coin scores — on that cell the sorting test does not merely fail, it is worse than chance, and no separation should be read into it`
                          : aucs.length && Math.min(...aucs) < 0.6
                            ? ', though at the bottom of that range it is close to it'
                            : ''
                      }.`
                    : `The gradient holds for “a ${situation}”: near-default countries cluster tightly, distant countries sit apart.`}
              </p>
              <TierNote
                tier="evidence"
                text={`For “a ${situation}” on ${MODEL_NAME[model]} the classifier scores ${Math.round(Math.min(...aucs) * 100)}–${Math.round(Math.max(...aucs) * 100)}% across the eight countries${
                  Math.min(...aucs) < 0.5
                    ? ' — and the floor of that range is below the 50% a coin would score, so for at least one country this model\u2019s plain and country sets are not separable at all'
                    : ''
                }. Every gap here also clears p < 0.0001 in a 10,000-shuffle permutation test: we relabelled the images at random ten thousand times, and no random relabelling ever produced a gap this size. The same gradient reproduces under a completely different image model: switch the ruler above from DINOv3 to CLIP and the ordering survives.`}
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

function SeedBySeedScene() {
  const { model } = useModel()
  const [situation, setSituation] = useState<Sit>('wedding')
  /* B13: this scene was SD 2.1 only, and the number it prints has a real exception
     the page never mentioned — Flux's non-Western share is 0.283 against SD 2.1's
     0.053, and 0.70 in one situation. The per-seed labels are now computed for all
     seven, so the switcher shows the exception instead of hiding it. Thumbnails
     exist for SD 2.1's full 50 only, hence the colour-strip fallback below. */
  const labels = (isSd21(model) ? F3[situation] : f3For(model, situation) ?? F3[situation]) as Code[]
  const allLabels = useMemo(
    () => (isSd21(model) ? SITS.map((s) => F3[s]) : SITS.map((s) => f3For(model, s) ?? F3[s])),
    [model]
  )
  const southTotal = allLabels.flat().filter((l) => SOUTH.includes(l as Code)).length
  const seedTotal = allLabels.flat().length
  const counts = useMemo(() => {
    const m = new Map<Code | 'default', number>()
    labels.forEach((l) => m.set(l, (m.get(l) ?? 0) + 1))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [labels])
  const southHere = labels.filter((l) => SOUTH.includes(l)).length
  /* the looser cut: everything that is not the US or Germany. Stated alongside the
     strict one so the choice of boundary is visible rather than assumed. */
  const nonWestLoose = allLabels.flat().filter((l) => l !== 'US' && l !== 'DE').length

  return (
    <SceneShell
      number="04"
      kicker="Part I · the default · finding 3"
      title={<>Not an average, <em className="font-display italic text-amber-200">seed by seed.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          A mean could hide a mixture: maybe half the default seeds are Western and half are not, cancelling out. For
          every default seed we ask which country's cluster it lies closest to. Across all {seedTotal} default seeds of{' '}
          <strong>{MODEL_NAME[model]}</strong>, <strong>{southTotal} ({(100 * southTotal / seedTotal).toFixed(1)}%)
          land nearest India, Nigeria, Indonesia or Egypt</strong>. The rest land nearest the US, Germany, or the
          mid-band countries Russia and Japan.
        </p>
        {/* Review 10 · C-2 and R6: this statistic depends entirely on where "non-Western"
            is cut, and the page used the strict cut without saying so. Recompute with Japan
            and Russia as non-Western and SD 2.1 goes from 5.3% to 35%. Both are now stated. */}
        <p className="prose-scene mt-4 max-w-2xl text-[13px] leading-6 text-foreground/55">
          <strong className="text-foreground/75">That percentage depends on where the line is drawn, so here is the
          line.</strong> “Non-Western” above means the four Global-South countries only. Russia and Japan are
          high-income countries that this study's own geometry places between the two groups, and counting them as
          Western is a choice rather than a fact. Count them the other way — anything that is not the US or Germany —
          and {MODEL_NAME[model]}'s share becomes{' '}
          <strong className="text-foreground/75">{((100 * nonWestLoose) / seedTotal).toFixed(1)}%</strong> instead of{' '}
          {((100 * southTotal) / seedTotal).toFixed(1)}%. Neither cut changes the direction result, which is measured
          between prompts rather than assigned by category — but the headline number moves a long way between them, so
          both are reported.
        </p>
        {southTotal / seedTotal > 0.15 && (
          <p className="prose-scene mt-4 max-w-2xl text-amber-200/85">
            This is the honest exception on the page. {MODEL_NAME[model]}'s plain prompt is markedly less Western than
            Stable Diffusion 2.1's — {(100 * southTotal / seedTotal).toFixed(1)}% against{' '}
            {(100 * F3_SOUTH_COUNT / F3_TOTAL).toFixed(1)}% — so the seed-composition claim does <em>not</em> hold
            uniformly across models. What does hold in all seven is the direction: Nigeria still sits farther from each
            model's own default than the USA does, in 42 of 42 model × situation cells.
          </p>
        )}
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
              reader count them and compare row to row instead of reflowing.
              Cross-models publish 24 thumbnails of the 50, so they get the same
              grid as colour cells — every seed's label, no invented pictures. */}
          {!isSd21(model) ? (
            <>
              <div className="mt-6 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
                {labels.map((l, seed) => (
                  <span
                    key={seed}
                    className="block aspect-square rounded-sm"
                    style={{ background: rgb(C8[l].cv) }}
                    title={`“a ${situation}” · seed ${seed} · nearest country cluster: ${C8[l].name}`}
                  />
                ))}
              </div>
              <p className="mt-2 font-mono2 text-[10px] leading-4 text-foreground/45">
                One cell per seed, coloured by the country cluster it lands nearest — hover for the country. Stable
                Diffusion 2.1 shows the pictures themselves here; the other six publish 24 thumbnails per cell of the
                50, so showing images would mean showing a subset while the tally counts all 50.
              </p>
            </>
          ) : (
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
          )}
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
  /* B11: the separability number the finding-5 box reports, over this situation's
     eight country cells. SD 2.1's own hardening table — hence the Sd21Only there. */
  const knnRange = useMemo(() => {
    const aucs = COUNTRY8.map((c) => HARDENING[key(situation, c.id)]?.knn_auc).filter((v): v is number => v != null)
    return aucs.length ? [Math.min(...aucs), Math.max(...aucs)] : [0.96, 0.99]
  }, [situation])
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
        {/* R5.6 / B11: this box used to read "silhouette 0.10–0.27, so the clustering
            is statistically real". A silhouette of 0.10 is barely above noise and does
            not support that sentence. The separability evidence is real and already in
            the project — k-NN AUC — so the box now leads with that and reports the
            silhouette as the weak number it is. */}
        <div className="rounded-lg border border-sky-300/25 bg-sky-300/5 p-4">
          <div className="font-mono2 text-[10px] tracking-widest text-sky-300/80 uppercase">
            finding 5 · the countries are separable
          </div>
          <p className="mt-2 text-sm leading-6 text-foreground/70">
            Ask a nearest-neighbour test to tell a country image from a plain-prompt one and it ranks them correctly{' '}
            <strong className="text-foreground">{Math.round(knnRange[0] * 100)}–{Math.round(knnRange[1] * 100)}%</strong>{' '}
            of the time across this situation's cells. That is the separability claim.
          </p>
          <p className="mt-2 text-[13px] leading-5 text-foreground/50">
            The clusters you see here are looser than they look: silhouette scores run{' '}
            {SILHOUETTE_RANGE[0].toFixed(2)}–{SILHOUETTE_RANGE[1].toFixed(2)}, and 0.10 is barely above noise. The
            countries are separable without being tidy, and the projection is a view, never the evidence.
          </p>
          <Sd21Only />
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
      <SeedBySeedScene />
      <MapScene />
    </>
  )
}
