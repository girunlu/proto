import { Fragment, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { CountUp } from '../components/CountUp'
import { ZoomImage, BarRow, DistanceRuler, KnnNote, Picker, MetricToggle, useMagnet } from '../components/Viz'
import { rgb, rgba } from '../lib/colors'
import {
  SITS, COUNTRY8, C8, CV_DEFAULT, cell, F3, F3_SOUTH_COUNT, F3_TOTAL, SOUTH,
  UMAP, UMAP_NAME_TO_CODE, SILHOUETTE_RANGE, seedImg,
  type Sit, type Code,
} from '../data/part1'
import { EMPTY_2D, HARDENING, key } from '../data/uiv2'
import { useModel, modelDist, modelImg, modelSeeds, isSd21, MODEL_NAME, type ModelId } from '../data/modelData'
import { CLIP_DIST } from '../data/part4'

const MAX_DIST = 0.7

/* the same claim can be re-measured with a second, independently trained vision
   model; every distance chart in this part reads whichever one is selected */
export type Ruler = 'dinov3' | 'clip'
/* SD 2.1 has both measuring sticks; the other six models were measured with
   DINOv3 only, so a CLIP request on those falls back and the UI says so. */
const dist = (m: ModelId, sit: Sit, code: Code, ruler: Ruler) =>
  isSd21(m)
    ? (ruler === 'dinov3' ? cell(sit, code).dist! : CLIP_DIST[sit][code])
    : modelDist(m, sit, code, 'dinov3')!
const distOrNull = (m: ModelId, sit: Sit, code: Code | 'default', ruler: Ruler) =>
  code === 'default' ? null : dist(m, sit, code, ruler)
const SIT_OPTS = SITS.map((s) => ({ value: s, label: `a ${s}` }))

/* ── shared bits ─────────────────────────────────────────────────────────── */

function Legend({ withDefault = true }: { withDefault?: boolean }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {withDefault && (
        <span className="flex items-center gap-1.5 font-mono2 text-[10px] text-foreground/50">
          <span className="h-2 w-2 rounded-full" style={{ background: rgb(CV_DEFAULT) }} /> default
        </span>
      )}
      {COUNTRY8.map((c) => (
        <span key={c.id} className="flex items-center gap-1.5 font-mono2 text-[10px] text-foreground/50">
          <span className="h-2 w-2 rounded-full" style={{ background: rgb(c.cv) }} /> {c.name}
        </span>
      ))}
    </div>
  )
}

/* ── Scene 1 · the unsaid (ported from Layer1Unsaid) ─────────────────────── */

const DECISIONS: { attr: string; answer: string; stat: string }[] = [
  { attr: 'dress color', answer: 'white', stat: '46 / 50 seeds' },
  { attr: 'venue', answer: 'church or garden', stat: '41 / 50 seeds' },
  { attr: 'setting', answer: 'outdoors', stat: 'majority across both VQA annotators' },
  { attr: 'time of day', answer: 'daytime', stat: '100% / 93% consistent (two annotators)' },
  { attr: 'people count', answer: 'a crowd, “6+”', stat: 'resists all counter-specification' },
  { attr: 'wealth cues', answer: 'average', stat: 'both annotators agree' },
  { attr: 'architecture', answer: 'historical, Western', stat: 'majority across both annotators' },
  { attr: 'weather', answer: 'unclear → defaulted anyway', stat: 'annotators hedge; the image does not' },
]

function UnsaidScene() {
  const [active, setActive] = useState(0)
  return (
    <SceneShell
      number="01"
      kicker="Part I · the default · the unsaid"
      title={<>Two words; <em className="font-display italic text-amber-200">thousands of decisions</em> left to the model.</>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          A prompt of <strong>“a wedding”</strong> specifies a noun and an article. The image additionally requires a
          setting, a dress, a crowd, architecture, an era, a palette, a light level, and a wealth level. These choices
          are not random in any meaningful sense: the model resolves each from its prior, in the same way, on nearly
          every seed. The decisions below are the answers Stable Diffusion gives <strong>when nothing is specified at all</strong>.
        </p>
      </Reveal>
      <div className="mt-12 grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <Reveal delay={0.05}>
          <Panel className="h-full">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">the prompt</div>
            <div className="font-display mt-3 text-5xl font-light">
              “a <span className="text-amber-200">wedding</span>”
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
              {DECISIONS.map((d, i) => (
                <button key={d.attr} onClick={() => setActive(i)} className={`chip ${active === i ? 'chip-active' : ''}`}>
                  {d.attr}
                </button>
              ))}
            </div>
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-8 rounded-lg border border-amber-300/20 bg-amber-300/5 p-6"
            >
              <div className="font-mono2 text-[11px] tracking-widest text-amber-200/70 uppercase">unspecified → supplied</div>
              <div className="font-display mt-2 text-3xl font-light">
                {DECISIONS[active].attr} = <span className="text-amber-200">“{DECISIONS[active].answer}”</span>
              </div>
              <div className="mt-3 font-mono2 text-xs text-foreground/50">{DECISIONS[active].stat}</div>
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
function MosaicWall({ onSelect, ruler }: { onSelect: (s: Sit) => void; ruler: Ruler }) {
  const { model } = useModel()
  const [hover, setHover] = useState<{ sit: Sit; code: Code | 'default' }>({ sit: 'wedding', code: 'NG' })
  const hoverSeeds = modelSeeds(model, hover.sit, hover.code, 4)
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
                const picks = modelSeeds(model, sit, code, 4)
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
                        whileInView={{ width: `${code === 'default' ? 2 : (d / MAX_DIST) * 100}%` }}
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
      <div className="hidden lg:block">
        <div className="sticky top-24 rounded-xl border border-border bg-background/70 p-3">
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
      </div>
    </div>
  )
}

function Heatmap({ onSelect, ruler }: { onSelect: (s: Sit) => void; ruler: Ruler }) {
  const { model } = useModel()
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
        <div>
          <div className="grid grid-cols-[96px_repeat(9,1fr)] gap-1">
            <div />
            <div className="pb-1 text-center font-mono2 text-[10px] text-foreground/45">default</div>
            {COUNTRY8.map((c) => (
              <div key={c.id} className="pb-1 text-center font-mono2 text-[10px]" style={{ color: rgb(c.cv) }}>
                {c.id}
              </div>
            ))}
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
                  const active = hover.sit === sit && hover.code === code
                  return (
                    <button
                      key={`${sit}-${code}`}
                      onMouseEnter={() => setHover({ sit, code })}
                      onClick={() => onSelect(sit)}
                      className={`relative flex h-11 items-center justify-center rounded font-mono2 text-[10px] transition-transform ${active ? 'z-10 scale-110 ring-1 ring-foreground/50' : ''}`}
                      style={{
                        background: code === 'default' ? rgba(CV_DEFAULT, 0.12) : rgba(cvc, 0.12 + 0.75 * (v / MAX_DIST)),
                        color: v > 0.3 ? '#0b0b10' : 'hsl(var(--foreground) / 0.75)',
                      }}
                      title={d ? `${sit} × ${code}: ${d.mean.toFixed(3)} [${d.ci_low.toFixed(3)}, ${d.ci_high.toFixed(3)}]` : 'the plain prompt, the reference point'}
                    >
                      {d ? d.mean.toFixed(2) : '·'}
                    </button>
                  )
                })}
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
        <p className="mt-2 font-mono2 text-[9px] text-foreground/35">
          hover any cell above to load its images · hover an image to enlarge it · 5 seeds spread typical → outlier, of 50
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
            max={MAX_DIST}
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
  const onSd21 = isSd21(model)
  const weddingUS = cell('wedding', 'US').dist!.mean
  const weddingNG = cell('wedding', 'NG').dist!.mean
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
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
              see the whole board · 54 cells, 4 of 50 seeds each, typical → outlier
            </div>
            {onSd21 && <MetricToggle value={ruler} onChange={setRuler} />}
          </div>
          {!onSd21 && (
            <p className="mt-3 font-mono2 text-[10px] leading-4 text-foreground/50">
              Showing <span className="text-amber-200">{MODEL_NAME[model]}</span>: its own images, and every distance
              measured from <em>its own</em> plain prompt rather than SD 2.1's. Nine seeds per prompt are published
              here against SD 2.1's fifty, and the second measuring stick was only run on SD 2.1.
            </p>
          )}
          <div className="mt-6">
            <MosaicWall onSelect={setSituation} ruler={ruler} />
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
              {onSd21 && <MetricToggle value={ruler} onChange={setRuler} />}
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
              <Picker label="situation" value={situation} onChange={setSituation} options={SIT_OPTS} />
              {onSd21 && <MetricToggle value={ruler} onChange={setRuler} />}
            </div>
          </div>
          <div className="mt-8">
            <DistanceBars situation={situation} ruler={ruler} />
          </div>
          <div className="mt-6 grid gap-4 border-t border-border pt-5 md:grid-cols-2">
            {onSd21 ? <KnnNote /> : (
              <p className="text-sm leading-6 text-foreground/60">
                The sorting test and the permutation tests were run on Stable Diffusion 2.1's full 50-seed run. For
                {' '}{MODEL_NAME[model]} the distances above are the measurement; switch back to SD 2.1 for the
                significance testing that accompanies them.
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
                text={`For “a ${situation}” the classifier scores ${Math.round(Math.min(...aucs) * 100)}–${Math.round(Math.max(...aucs) * 100)}% across the eight countries. Every gap here also clears p < 0.0001 in a 10,000-shuffle permutation test: we relabelled the images at random ten thousand times, and no random relabelling ever produced a gap this size. The same gradient reproduces under a completely different image model, CLIP (scene 15).`}
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
function EmptyScatter({ hover, setHover }: {
  hover: { sit: Sit; code: Code | 'default' }
  setHover: (h: { sit: Sit; code: Code | 'default' }) => void
}) {
  const W = 760
  const H = 430
  const padL = 46
  const padB = 44
  const padT = 14
  const padR = 20
  const [x0, x1] = [0.27, 0.63]
  const [y0, y1] = [-0.04, 0.64]
  const X = (v: number) => padL + ((v - x0) / (x1 - x0)) * (W - padL - padR)
  const Y = (v: number) => H - padB - ((v - y0) / (y1 - y0)) * (H - padT - padB)

  const meanByCountry = useMemo(() => {
    const m = new Map<Code | 'default', { x: number; y: number; n: number }>()
    EMPTY_2D.forEach((p) => {
      const cur = m.get(p.code) ?? { x: 0, y: 0, n: 0 }
      m.set(p.code, { x: cur.x + p.d_empty, y: cur.y + p.d_default, n: cur.n + 1 })
    })
    return [...m.entries()].map(([code, v]) => ({ code, x: v.x / v.n, y: v.y / v.n }))
  }, [])

  // the pointer snaps to the nearest prompt rather than having to land on it
  const magnet = useMagnet(
    EMPTY_2D.map((p) => ({ x: X(p.d_empty), y: Y(p.d_default), item: p })),
    (p) => p && setHover({ sit: p.sit, code: p.code })
  )
  const active = EMPTY_2D.find((p) => p.sit === hover.sit && p.code === hover.code)

  return (
    <div className="mx-auto max-w-3xl">
      {/* axis titles live outside the drawing, where nothing can collide with them */}
      <div className="mb-1 font-mono2 text-[10px] text-foreground/45">
        ↑ how far the prompt sits from its own plain prompt
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair" {...magnet}>
        {[0.3, 0.4, 0.5, 0.6].map((v) => (
          <g key={`x${v}`}>
            <line x1={X(v)} x2={X(v)} y1={padT} y2={H - padB} stroke="hsl(var(--grid))" strokeDasharray="3 5" />
            <text x={X(v)} y={H - padB + 15} textAnchor="middle" fontSize="10" fill="hsl(var(--svg-fg))" fontFamily="JetBrains Mono">{v.toFixed(1)}</text>
          </g>
        ))}
        {[0.2, 0.4, 0.6].map((v) => (
          <g key={`y${v}`}>
            <line x1={padL} x2={W - padR} y1={Y(v)} y2={Y(v)} stroke="hsl(var(--grid))" strokeDasharray="3 5" />
            <text x={padL - 8} y={Y(v) + 3} textAnchor="end" fontSize="10" fill="hsl(var(--svg-fg))" fontFamily="JetBrains Mono">{v.toFixed(1)}</text>
          </g>
        ))}

        {/* the snapped point gets a crosshair so the magnet is legible */}
        {active && (
          <g pointerEvents="none">
            <line x1={padL} x2={W - padR} y1={Y(active.d_default)} y2={Y(active.d_default)} stroke="hsl(var(--foreground) / 0.18)" />
            <line x1={X(active.d_empty)} x2={X(active.d_empty)} y1={padT} y2={H - padB} stroke="hsl(var(--foreground) / 0.18)" />
          </g>
        )}

        {EMPTY_2D.map((p) => {
          const cv = p.code === 'default' ? CV_DEFAULT : C8[p.code].cv
          const on = hover.sit === p.sit && hover.code === p.code
          return (
            <circle
              key={`${p.sit}_${p.code}`}
              cx={X(p.d_empty)}
              cy={Y(p.d_default)}
              r={on ? 7 : 4.5}
              fill={rgb(cv)}
              fillOpacity={on ? 1 : 0.45}
              stroke={on ? 'white' : 'none'}
              pointerEvents="none"
            />
          )
        })}
        {meanByCountry.map((m) => {
          const cv = m.code === 'default' ? CV_DEFAULT : C8[m.code].cv
          const low = Y(m.y) > H - padB - 40
          return (
            <g key={`m${m.code}`} pointerEvents="none">
              <circle cx={X(m.x)} cy={Y(m.y)} r={10} fill="none" stroke={rgb(cv)} strokeWidth={2.5} />
              <text
                x={X(m.x)}
                y={low ? Y(m.y) - 15 : Y(m.y) + 22}
                textAnchor="middle"
                fontSize="10"
                fill={rgb(cv)}
                fontFamily="JetBrains Mono"
              >
                {m.code === 'default' ? 'plain' : m.code}
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
  const [hover, setHover] = useState<{ sit: Sit; code: Code | 'default' }>({ sit: 'wedding', code: 'NG' })
  const point = EMPTY_2D.find((p) => p.sit === hover.sit && p.code === hover.code)
  const seeds = cell(hover.sit, hover.code).typical_order
  const cv = hover.code === 'default' ? CV_DEFAULT : C8[hover.code].cv
  const west = EMPTY_2D.filter((p) => p.code === 'US' || p.code === 'DE')
  const far = EMPTY_2D.filter((p) => p.code === 'NG' || p.code === 'IN')
  const avg = (a: typeof west) => a.reduce((s, p) => s + p.d_empty, 0) / a.length
  return (
    <SceneShell
      number="03"
      kicker="Part I · the default · finding 2"
      title={<>Even <em className="font-display italic text-amber-200">no prompt at all</em> is Western-leaning.</>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          We generated <strong>30 images from an empty prompt</strong>, the model with nothing asked of it at all. Those
          30 images sit <strong>{avg(west).toFixed(2)}</strong> away from the US and German pictures and{' '}
          <strong>{avg(far).toFixed(2)}</strong> away from the Nigerian and Indian ones, averaged over all six events.
          Before a single word is typed, the model is already somewhere.
        </p>
      </Reveal>

      <Reveal delay={0.06}>
        <Panel className="mt-10">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            what “” draws · 12 of the 30 empty-prompt images
          </div>
          <div className="mt-5 grid grid-cols-6 gap-2">
            {Array.from({ length: 12 }, (_, i) => `/images/zero/ep_${String(i).padStart(2, '0')}.webp`).map((src, i) => (
              <ZoomImage
                key={src}
                src={src}
                alt="empty-prompt generation"
                caption={`the empty prompt “” · image ${i + 1} of 30`}
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
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            all 54 cells, measured against two reference points at once
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/60">
            Each small dot is one prompt: “a wedding in Nigeria”, “a breakfast in Japan”, and so on. Its horizontal
            position is how far that prompt's pictures sit from the empty prompt. Its vertical position is how far they
            sit from the same event's plain prompt. The ringed markers are the eight country averages across all six
            events. If the empty prompt had no cultural location the cloud would be a vertical smear at one x value.
            Instead it runs diagonally: <strong>the prompts that are far from the plain prompt are exactly the prompts
            that are far from the empty one.</strong>
          </p>
          <div className="mt-6">
            <EmptyScatter hover={hover} setHover={setHover} />
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
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {[seeds[0], seeds[24], seeds[49]].map((s) => (
                    <ZoomImage
                      key={s}
                      src={seedImg(hover.sit, hover.code, s)}
                      alt={`${hover.sit} ${hover.code} seed ${s}`}
                      caption={`“a ${hover.sit}${hover.code === 'default' ? '' : ` in ${C8[hover.code].name}`}” · seed ${s}`}
                      imgClassName="aspect-square w-full cursor-zoom-in rounded-md border border-border object-cover"
                    />
                  ))}
                </div>
                <p className="mt-2 font-mono2 text-[9px] text-foreground/35">hover any dot to load its images here</p>
              </div>
              <div className="flex flex-col justify-between gap-5">
                <Legend />
                <p className="font-display border-l-2 border-amber-300/50 pl-4 text-lg leading-7 text-foreground/85 italic">
                  The default is not an answer the model gives. It is the state the model is already in.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 border-t border-border pt-4">
            <TierNote
              tier="evidence"
              text="30 empty-prompt images at CFG 7.5. Horizontal axis: distance from the empty-prompt centroid to each variant's centroid, with bootstrap confidence intervals. Vertical axis: the same measurement against each situation's own plain prompt."
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
            <Picker label="situation" value={situation} onChange={setSituation} options={SIT_OPTS} />
          </div>
          <div className="mt-6 flex flex-wrap gap-1.5">
            {labels.map((l, seed) => (
              <span key={seed} className="relative block">
                <ZoomImage
                  src={seedImg(situation, 'default', seed)}
                  alt={`${situation} default seed ${seed}`}
                  caption={`“a ${situation}” · seed ${seed} · nearest country cluster: ${C8[l].name}`}
                  imgClassName="h-14 w-14 cursor-zoom-in rounded-md border border-border object-cover"
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

function UmapScatter({ situation }: { situation: Sit }) {
  const [hover, setHover] = useState<{ code: Code | 'default'; seed: number } | null>(null)
  const data = UMAP[situation]
  const xs = data.points.map((p) => p.x)
  const ys = data.points.map((p) => p.y)
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)]
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)]
  const W = 640
  const H = 420
  const pad = 26
  const X = (x: number) => pad + ((x - x0) / (x1 - x0)) * (W - 2 * pad)
  const Y = (y: number) => H - pad - ((y - y0) / (y1 - y0)) * (H - 2 * pad)

  const magnet = useMagnet(
    data.points.map((p) => ({ x: X(p.x), y: Y(p.y), item: p })),
    (p) => p && setHover({ code: UMAP_NAME_TO_CODE[p.country], seed: p.seed })
  )

  return (
    <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair" {...magnet}>
        {data.points.map((p, i) => {
          const code = UMAP_NAME_TO_CODE[p.country]
          const cv = code === 'default' ? CV_DEFAULT : C8[code].cv
          return (
            <circle
              key={i}
              cx={X(p.x)}
              cy={Y(p.y)}
              r={hover?.seed === p.seed && hover?.code === code ? 7 : 4}
              fill={rgb(cv)}
              fillOpacity={code === 'default' ? 0.9 : 0.65}
              stroke={hover?.seed === p.seed && hover?.code === code ? 'white' : 'none'}
              pointerEvents="none"
              className="transition-all"
            />
          )
        })}
        {Object.entries(data.centroids).map(([name, c]) => {
          const code = UMAP_NAME_TO_CODE[name]
          const cv = code === 'default' ? CV_DEFAULT : C8[code].cv
          return (
            <g key={name}>
              <circle cx={X(c.x)} cy={Y(c.y)} r={8} fill="none" stroke={rgb(cv)} strokeWidth={2} />
              <text x={X(c.x)} y={Y(c.y) - 12} textAnchor="middle" fontSize="9" fill={rgb(cv)} fontFamily="JetBrains Mono">
                {name === 'default' ? 'default' : code}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="flex flex-col gap-4">
        <div className="flex min-h-[120px] items-center gap-4 rounded-lg border border-border p-3">
          {hover ? (
            <>
              <ZoomImage
                src={seedImg(situation, hover.code, hover.seed)}
                alt={`${situation} ${hover.code} seed ${hover.seed}`}
                caption={`“a ${situation}${hover.code === 'default' ? '' : ` in ${C8[hover.code].name}`}” · seed ${hover.seed}`}
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
              UMAP of real DINOv3 embeddings · {situation} · 30 images per variant · rings = true centroids
            </div>
            <Picker label="situation" value={situation} onChange={setSituation} options={SIT_OPTS} />
          </div>
          <div className="mt-6">
            <UmapScatter situation={situation} />
          </div>
          <div className="mt-6 grid gap-4 border-t border-border pt-5 md:grid-cols-2">
            <Legend />
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
