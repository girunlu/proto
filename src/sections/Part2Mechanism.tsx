import { Fragment, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { ZoomImage, Picker, BoxPicker, MetricToggle, HowItWorks, Setup, useMagnet } from '../components/Viz'
import { Sd21Only } from '../components/ModelBar'
import { rgb, rgba } from '../lib/colors'
import { niceTicks } from '../lib/utils'
import { C8, COUNTRY8, SITS, seedImg, type Sit, type Code } from '../data/part1'
import {
  LOCKUP, LOCKUP_STEPS, stepKey, DIRECTIONS, HERO_DIRECTION,
  LAION,
} from '../data/part2'
import { swapImgSeed } from '../data/uiv2'
import { lockFit, fitCurve, matrix, dist as xmDist, intraset as xmIntraset, type Ruler } from '../data/crossmodel'
import { useModel, isSd21, MODEL_NAME } from '../data/modelData'

const MONO = 'JetBrains Mono'
const SIT_OPTS = SITS.map((s) => ({ value: s, label: `a ${s}` }))

/* ── Scene 10 · the scene is settled early (F9) ──────────────────────────── */

function parseDirection(d: string): { sit: Sit; a: Code; b: Code } {
  const m = d.match(/^([a-z]+)_([A-Z]+)_to_([A-Z]+)$/)!
  return { sit: m[1] as Sit, a: m[2] as Code, b: m[3] as Code }
}

function LockupCurve({ direction, activeStep, onPick }: {
  direction: string
  activeStep: number
  onPick: (s: number) => void
}) {
  const W = 620
  const H = 210
  const padL = 46
  const padB = 34
  const padT = 14
  const x = (step: number) => padL + ((step - 1) / 29) * (W - padL - 18)
  const y = (p: number) => padT + (1 - p) * (H - padT - padB)
  const pts = LOCKUP_STEPS.map((s) => ({ s,...LOCKUP[direction].curve[stepKey(s)] }))
  const isHero = direction === HERO_DIRECTION
  /* Tier C: every direction's own logistic fit is exported now, so the curve is no
     longer one hardcoded hero line. Two of the 24 did not converge (family EG→RU,
     funeral IN→RU) and simply get no curve, which is the honest outcome. */
  const fit = lockFit(direction)

  const fitPath = useMemo(() => {
    if (!fit) return ''
    const out: string[] = []
    for (let s = 1; s <= 30; s += 0.25) {
      const p = fitCurve(direction, s)
      if (p == null) return ''
      out.push(`${out.length === 0 ? 'M' : 'L'}${x(s).toFixed(1)},${y(p).toFixed(1)}`)
    }
    return out.join(' ')
  }, [direction, fit])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {fit && (
        <>
          <rect x={x(fit.ci[0])} y={padT} width={x(fit.ci[1]) - x(fit.ci[0])} height={H - padT - padB} fill={rgba('--c-amber', 0.08)} />
          <text x={(x(fit.ci[0]) + x(fit.ci[1])) / 2} y={padT + 11} textAnchor="middle" fontSize="9" fill={rgba('--c-amber-t', 0.85)} fontFamily={MONO}>
            the switchover: step {fit.step} (95% CI {fit.ci[0]}–{fit.ci[1]})
          </text>
        </>
      )}
      <line x1={padL} x2={W - 18} y1={y(0.5)} y2={y(0.5)} stroke="hsl(var(--grid))" strokeDasharray="4 4" />
      <text x={W - 20} y={y(0.5) - 5} textAnchor="end" fontSize="9" fill="hsl(var(--svg-fg))" fontFamily={MONO}>
        50%, a coin flip
      </text>
      {[0, 0.5, 1].map((v) => (
        <text key={v} x={padL - 8} y={y(v) + 4} textAnchor="end" fontSize="9" fill="hsl(var(--svg-fg))" fontFamily={MONO}>
          {Math.round(v * 100)}%
        </text>
      ))}
      {[1, 10, 20, 30].map((v) => (
        <text key={v} x={x(v)} y={H - 15} textAnchor="middle" fontSize="9" fill="hsl(var(--svg-fg))" fontFamily={MONO}>
          {v}
        </text>
      ))}
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize="9" fill="hsl(var(--svg-fg))" fontFamily={MONO}>
        the step at which we swapped the prompt (of 30)
      </text>
      {fitPath && (
        <motion.path
          key={direction}
          d={fitPath}
          fill="none"
          stroke={rgb('--c-amber')}
          strokeWidth="2.5"
          strokeDasharray={fit && fit.type === 'strong' ? undefined : '5 4'}
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6 }}
        />
      )}
      {!fit && (
        <text x={W / 2} y={padT + 12} textAnchor="middle" fontSize="9" fill="hsl(var(--svg-fg))" fontFamily={MONO}>
          no clean logistic fit for this direction: the five measured points are all there is
        </text>
      )}
      {pts.map((p, i) => (
        <motion.g key={p.s} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.12 }} onClick={() => onPick(p.s)} className="cursor-pointer">
          <line x1={x(p.s)} x2={x(p.s)} y1={y(p.ci_low)} y2={y(p.ci_high)} stroke="hsl(var(--foreground) / 0.6)" strokeWidth="1.5" />
          <circle cx={x(p.s)} cy={y(p.p_closer_B)} r={p.s === activeStep ? 7 : 4.5} fill={isHero ? rgb('--c-amber') : 'hsl(var(--foreground) / 0.75)'} stroke={rgb('--bg')} strokeWidth="2" />
        </motion.g>
      ))}
      <line x1={x(activeStep)} x2={x(activeStep)} y1={padT} y2={H - padB} stroke="hsl(var(--foreground) / 0.3)" />
    </svg>
  )
}

function CommitEarlyScene() {
  const [sit, setSit] = useState<Sit>('wedding')
  const dirsFor = (s: Sit) => DIRECTIONS.filter((d) => parseDirection(d).sit === s)
  const [direction, setDirection] = useState(HERO_DIRECTION)
  const [step, setStep] = useState(10)
  const [seed, setSeed] = useState(1)

  const setSituation = (s: Sit) => {
    setSit(s)
    setDirection(dirsFor(s)[0])
  }
  const { a, b } = parseDirection(direction)
  const fit = lockFit(direction)
  const pt = LOCKUP[direction].curve[stepKey(step)]
  const committed = pt.p_closer_B < 0.5
  const dirOpts = dirsFor(sit).map((d) => {
    const p = parseDirection(d)
    return { value: d, label: `${C8[p.a].name} → ${C8[p.b].name}` }
  })

  return (
    <SceneShell
      number="06"
      kicker="Part III · the mechanism · finding 9"
      title={<>Which country it depicts is settled in the <em className="font-display italic text-amber-200">first third</em> of generation.</>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          We interrupted a 30-step generation: the prompt starts as one country's, and at step k we quietly swap in
          another's. If the finished image still looks like the first country, its identity was decided before we
          intervened.
        </p>
        <Sd21Only />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-6 max-w-3xl">
          <Setup
            rows={[
              { k: 'what we ran', v: 'A 30-step generation started on one country’s prompt and quietly re-conditioned to another’s at step k. DDIM trajectories are deterministic per seed, so the only thing that changes is when we intervened.' },
              { k: 'how much', v: '24 direction pairs × 5 swap points × 12 seeds = 1,440 interrupted generations. Twelve seeds rather than the usual fifty because each point is a separate run.' },
              { k: 'what we measured', v: 'Which country’s centroid the finished image’s embedding sits nearer to.' },
              { k: 'how we know', v: 'A logistic fit per direction puts the switchover at step 9.6 of 30 (95% CI 8.4–11.3). Two of the 24 fits did not converge and are drawn without a curve rather than smoothed over.' },
            ]}
          detail={<>
              <p>
                <strong>Why the swap is clean.</strong> DDIM is deterministic, so the same seed run twice gives the
                same trajectory. Re-conditioning at step k therefore isolates one variable, when the intervention
                happened, with the noise schedule and the seed held identical.
              </p>
              <p>
                <strong>The fit.</strong> Five swap points per direction, 12 seeds each, outcome coded as “landed
                nearer B”. A logistic curve is fitted per direction and the switchover is where it crosses 0.5;
                confidence intervals are bootstrapped. Pooled across directions that lands at step 9.6 of 30.
              </p>
              <p>
                <strong>Failures are drawn as failures.</strong> Two of the 24 directions (family EG→RU, funeral IN→RU)
                did not converge to a usable fit. They are shown with their five measured points and no curve rather
                than smoothed into a line that the data does not support.
              </p>
              <p>
                <strong>Scope.</strong> This is the microscope tier and it is SD 2.1 only, by design, repeating 1,440
                interrupted generations per model was never the plan. Treat it as done, not pending.
              </p>
          </>}
        />
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <Panel className="mt-10">
          <div className="flex flex-col gap-2.5">
            <BoxPicker label="event" value={sit} onChange={setSituation} options={SIT_OPTS} size="sm" />
            <BoxPicker label="swap direction" value={direction} onChange={setDirection} options={dirOpts} size="sm" />
            <Picker
              label="seed"
              value={String(seed)}
              onChange={(v) => setSeed(Number(v))}
              options={Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: `seed ${i}` }))}
              width="w-28"
            />
          </div>

          {/* the transition: A's own image, the swapped result, B's own image */}
          <div className="mt-6 grid items-center gap-3 sm:grid-cols-[1fr_auto_1.3fr_auto_1fr]">
            <figure className="text-center">
              <ZoomImage
                src={seedImg(sit, a, seed)}
                alt={`a ${sit} in ${C8[a].name}, seed ${seed}`}
                caption={`“a ${sit} in ${C8[a].name}” · seed ${seed} · never interrupted`}
                imgClassName="aspect-square w-full cursor-zoom-in rounded-lg border-2 object-cover"
              />
              <figcaption className="mt-2 font-mono2 text-[10px] leading-4" style={{ color: rgb(C8[a].cv) }}>
                “a {sit} in {C8[a].name}”
                <br />
                <span className="text-foreground/40">where generation starts</span>
              </figcaption>
            </figure>
            <div className="hidden text-center font-mono2 text-lg text-foreground/30 sm:block">→</div>
            <figure className="text-center">
              <ZoomImage
                src={swapImgSeed(direction, step, seed)}
                alt={`swapped at step ${step}, seed ${seed}`}
                caption={`swapped from “${C8[a].name}” to “${C8[b].name}” at step ${step} of 30 · seed ${seed}`}
                imgClassName="aspect-square w-full cursor-zoom-in rounded-lg border-2 border-amber-300/70 object-cover"
              />
              <figcaption className="mt-2 font-mono2 text-[10px] leading-4 text-amber-200">
                prompt swapped at step {step}
                <br />
                <span className="text-foreground/40">same seed, same start, new instruction</span>
              </figcaption>
            </figure>
            <div className="hidden text-center font-mono2 text-lg text-foreground/30 sm:block">←</div>
            <figure className="text-center">
              <ZoomImage
                src={seedImg(sit, b, seed)}
                alt={`a ${sit} in ${C8[b].name}, seed ${seed}`}
                caption={`“a ${sit} in ${C8[b].name}” · seed ${seed} · never interrupted`}
                imgClassName="aspect-square w-full cursor-zoom-in rounded-lg border-2 object-cover"
              />
              <figcaption className="mt-2 font-mono2 text-[10px] leading-4" style={{ color: rgb(C8[b].cv) }}>
                “a {sit} in {C8[b].name}”
                <br />
                <span className="text-foreground/40">what the new prompt generates on its own</span>
              </figcaption>
            </figure>
          </div>

          {/* the step slider */}
          <div className="mt-8">
            <div className="flex items-center gap-4">
              <span className="shrink-0 font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">swap at step</span>
              <input
                type="range"
                min={0}
                max={LOCKUP_STEPS.length - 1}
                step={1}
                value={LOCKUP_STEPS.indexOf(step)}
                onChange={(e) => setStep(LOCKUP_STEPS[Number(e.target.value)])}
                className="h-1 flex-1 cursor-pointer accent-amber-300"
                aria-label="swap step"
              />
              <span className="w-10 shrink-0 font-mono2 text-sm text-amber-200">{step}</span>
            </div>
            <div className="mt-2 flex gap-2">
              {LOCKUP_STEPS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStep(s)}
                  className={`flex-1 rounded-md border py-1 font-mono2 text-[11px] transition ${s === step ? 'border-amber-300/60 bg-amber-300/10 text-amber-200' : 'border-border text-foreground/45 hover:text-foreground'}`}
                >
                  step {s}
                </button>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between font-mono2 text-[10px] text-foreground/50">
              <span>swap early: the new prompt still gets its way</span>
              <span>swap late: the identity is already fixed</span>
            </div>
          </div>

          {/* what the phases are, and the measured outcome */}
          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_240px]">
            <div>
              <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-lg border border-border font-mono2 text-[10px]">
                <div className={`px-3 py-2 text-center transition ${step <= 10 ? 'bg-amber-300/15 text-amber-200' : 'text-foreground/40'}`}>
                  steps 1–10 · composition<br />
                  <span className="text-foreground/55">layout, setting, cultural content</span>
                </div>
                <div className={`px-3 py-2 text-center transition ${step > 10 && step <= 20 ? 'bg-amber-300/15 text-amber-200' : 'text-foreground/40'}`}>
                  steps 10–20 · structure<br />
                  <span className="text-foreground/55">objects, people, poses</span>
                </div>
                <div className={`px-3 py-2 text-center transition ${step > 20 ? 'bg-amber-300/15 text-amber-200' : 'text-foreground/40'}`}>
                  steps 20–30 · texture<br />
                  <span className="text-foreground/55">fabric, skin, detail</span>
                </div>
              </div>
              <div className="mt-5">
                <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
                  measured over 12 seeds: how often the swap actually wins
                </div>
                <LockupCurve direction={direction} activeStep={step} onPick={setStep} />
              </div>
            </div>
            <div className="self-start rounded-lg border border-border bg-background/60 p-4 text-center">
              <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">swapped at step {step}</div>
              <div className={`font-mono2 mt-1 text-4xl ${committed ? 'text-red-300' : 'text-emerald-300'}`}>{Math.round(pt.p_closer_B * 100)}%</div>
              <div className="mt-1 font-mono2 text-[11px] leading-4 text-foreground/50">
                of the 12 seeds end up closer to “{C8[b].name}” than to “{C8[a].name}”
              </div>
              <div className="mt-2 font-mono2 text-[11px] leading-4" style={{ color: committed ? rgb('--c-red-t') : rgb('--c-em-t') }}>
                {committed ? `mostly still ${C8[a].name}: too late` : 'the new prompt is still in charge'}
              </div>
              <div className="mt-2 font-mono2 text-[10px] text-foreground/35">95% CI {Math.round(pt.ci_low * 100)}–{Math.round(pt.ci_high * 100)}%</div>
            </div>
          </div>

          <p className="mt-6 border-t border-border pt-5 text-sm leading-6 text-foreground/60">
            {fit && fit.type !== 'strong' && 'The curve is dashed: this pair separates only weakly to begin with. '}
            Timing is early in all 24 tested directions; what varies between them is the size of the visual gap, not
            when it closes.
          </p>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Scene 07 · not the text encoder (F12) ───────────────────────────────── */

/* Restored 2026-08-10 (Giray) from frontend/proto @ ec2f943f, where it was
   scene 09 before the 2026-08-06 restructure deleted it. It sits here, straight
   after the prompt switching: that scene shows *when* the country is decided,
   this one rules out the remaining innocent explanation for *where* it comes
   from — the text encoder rather than the drawing. Every dependency (matrix(),
   crossmodel.matrices, HowItWorks) survived the deletion untouched. */

/* Each grid is scaled to its OWN range. Sharing one scale let the image grid's
   larger spread wash the text grid out to near-blank, which is precisely the
   comparison the reader is being asked to make. */
function BigMatrix({ m, kind, title, sub }: {
  m: NonNullable<ReturnType<typeof matrix>>
  kind: 'txt' | 'img'
  title: string
  sub: string
}) {
  const mat = kind === 'txt' ? m.txt : m.img
  const labels = m.countries
  const [hover, setHover] = useState<{ i: number; j: number } | null>(null)
  /* One grade for both grids (2026-08-10, Giray). Both encode the same job —
     magnitude — so both take the page's sequential hue, the same amber ramp
     scene 02's heatmap uses. The old sky/red split read as two different
     measurements when the whole point is one measurement taken twice. */
  const cv = '--c-amber'

  const dists = mat.flatMap((row, i) => row.map((v, j) => (i === j ? null : 1 - v))).filter((v): v is number => v !== null)
  const lo = Math.min(...dists)
  const hi = Math.max(...dists)
  const norm = (d: number) => (hi === lo ? 0.5 : (d - lo) / (hi - lo))

  return (
    <div>
      {/* the title carried the grid's identity in its colour while the two ramps
          differed; with one ramp it wears a text token and the words do the work */}
      <div className="font-mono2 text-[11px] text-foreground/75">{title}</div>
      <div className="font-mono2 text-[10px] leading-4 text-foreground/40">{sub}</div>
      <div className="mt-3 grid gap-[2px]" style={{ gridTemplateColumns: `52px repeat(${labels.length}, minmax(0,1fr))` }}>
        <div />
        {labels.map((l) => (
          <div key={l} className="pb-1 text-center font-mono2 text-[9px] text-foreground/45">{l === 'default' ? 'plain' : l}</div>
        ))}
        {labels.map((rl, i) => (
          <Fragment key={rl}>
            <div className="pr-1.5 text-right font-mono2 text-[9px] leading-8 text-foreground/45">
              {rl === 'default' ? 'plain' : rl}
            </div>
            {mat[i].map((sim, j) => {
              const d = 1 - sim
              const t = i === j ? 0 : norm(d)
              const on = hover?.i === i && hover?.j === j
              return (
                <div
                  key={`${rl}-${j}`}
                  onMouseEnter={() => setHover({ i, j })}
                  onMouseLeave={() => setHover(null)}
                  className={`flex h-8 items-center justify-center rounded-sm font-mono2 text-[9px] transition ${on ? 'ring-1 ring-foreground/60' : ''}`}
                  style={{
                    background: i === j ? 'hsl(var(--grid))' : rgba(cv, 0.1 + 0.85 * t),
                    color: t > 0.55 ? '#0b0b10' : 'hsl(var(--foreground) / 0.7)',
                  }}
                >
                  {i === j ? '' : d.toFixed(2)}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
      {/* this grid's own scale, printed with its own end points */}
      <div className="mt-3 flex items-center gap-2">
        <span className="font-mono2 text-[9px] text-foreground/45">{lo.toFixed(2)}</span>
        <span
          className="h-2.5 flex-1 rounded-sm"
          style={{ background: `linear-gradient(90deg, ${rgba(cv, 0.1)}, ${rgba(cv, 0.95)})` }}
        />
        <span className="font-mono2 text-[9px] text-foreground/45">{hi.toFixed(2)}</span>
      </div>
      {/* Both grids now share one ramp, so nothing but this line tells the reader
          the two scales are different. It carried a /35 opacity when the colour
          split did that job; at /55 it is actually legible. */}
      <p className="mt-1 font-mono2 text-[9px] leading-4 text-foreground/55">
        nearest and furthest pair in <em>this</em> grid. The two grids measure in different spaces, so each is shaded
        over its own range and the same shade means different numbers on either side. Read the <em>pattern</em>, never
        the colour.
      </p>
      {/* The hover readout ("Nigeria vs the plain prompt: 0.251 apart") is off,
          2026-08-10 (Giray) — this scene only. Every cell already prints its own
          number, so the readout restated it three inches lower, and its extra
          decimal invited exactly the cross-grid magnitude comparison the prose
          above now warns against. Hover still lifts the cell; only the number
          went. */}
    </div>
  )
}

function TextEncoderScene() {
  const { model } = useModel()
  const [sit, setSit] = useState<Sit>('wedding')
  /* Tier C: all seven models are here now. The text side is each model's own
     encoder stack — the 2026-07-27 fix, since only SDXL is CLIP-family — and the
     image side is that model's own 50-image sets. */
  const m = matrix(model, sit)
  /* the per-event Mantel rows were computed here for the panel removed on
     2026-08-10; matrix() still carries r and p per (model, event) if it returns */
  if (!m) return null
  return (
    <SceneShell
      number="07"
      kicker="Part III · the mechanism · finding 12"
      title={<>The assumption is added <em className="font-display italic text-amber-200">while drawing</em>, not read off the prompt.</>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          One more innocent explanation to rule out. Before any picture is drawn, the sentence you typed is turned into
          numbers by a separate component, the text encoder. Perhaps that component already puts “a wedding” and “a
          wedding in the USA” next to each other, and the image half is simply following orders. If so, the shape of
          the two geometries should match.
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-8 max-w-3xl">
          <Setup
            rows={[
              { k: 'what we compared', v: 'For one event, all nine prompts measured twice over: once as sentences in the model’s own text encoder, once as the 50-image sets those sentences actually produce.' },
              { k: 'what would settle it', v: 'If the picture geometry were inherited from the sentence geometry, the two grids would have the same shape, the same pairs near, the same pairs far.' },
              { k: 'how we know', v: 'A Mantel test compares two distance grids and returns r, from 0 (no shared shape) to 1 (identical). Its p-value comes from reshuffling the labels 10,000 times.' },
              { k: 'the limit', v: 'The two grids measure in different spaces, so only their shape can be compared, never their magnitudes.' },
            ]}
          detail={<>
              <p>
                <strong>Each model reads with its own encoder.</strong> The text side is not CLIP standing in for
                everyone, only SDXL is CLIP-family. Every model's own encoder stack embeds the nine prompts, which is
                the only version of this test that can support a claim about that model.
              </p>
              <p>
                <strong>The Mantel test.</strong> Two 9×9 distance grids, correlated entry-by-entry over the
                off-diagonal, with significance from 10,000 label reshuffles. It is a test of <em>shape</em>: whether
                the pairs that are near in one grid are the pairs that are near in the other.
              </p>
              <p>
                <strong>The result is a null, and that is the finding.</strong> Across the six other models' native
                encoders only a small minority of event × model combinations show any significant relationship. If the
                separation were inherited from the prompt geometry, this is where it would show, and it does not.
              </p>
          </>}
        />
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
              the same nine prompts, measured two ways
            </div>
            <BoxPicker label="event" value={sit} onChange={setSit} options={SIT_OPTS} size="sm" />
          </div>
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <BigMatrix
              m={m}
              kind="txt"
              title="as sentences · before any image exists"
              sub={`how far apart the nine prompts are, read by ${MODEL_NAME[model]}'s own text encoder`}
            />
            <BigMatrix m={m} kind="img" title="as pictures · once they are drawn" sub="how far apart the nine 50-image sets are" />
          </div>
          {/* No prose under the grids, 2026-08-10 (Giray). Do not write a sentence
              here comparing the two grids' magnitudes — that is what used to be
              here ("in the picture grid the same pair is dramatically farther
              apart") and it was false: on SD 2.1 the wedding/Nigeria pair is 0.40
              apart as sentences and 0.25 as pictures, with the image distance the
              smaller one in four of the seven models. It cannot be repaired by
              picking a different pair either — a cosine in text space and a cosine
              in image space are different rulers, so no magnitude claim across the
              two grids is meaningful. Only the shape of the two grids can be
              compared, which is what the reader is asked to do by eye. */}
        </Panel>
      </Reveal>

      {/* The Mantel panel ("does the sentence pattern predict the picture
          pattern?") is REMOVED 2026-08-10 (Giray). It reported r per event with a
          permutation p, and the answer was a null: the sentence geometry does not
          predict the picture geometry. The two grids above now carry the scene on
          their own. NATIVE_MANTEL and the per-matrix r/p are still exported and
          still in crossmodel.json, so this can be rebuilt from data if wanted. */}
    </SceneShell>
  )
}

/* ── Scene 11 · not copied from the data (F13) ───────────────────────────── */

/* Each grid is scaled to its OWN range. Sharing one scale let the image grid's
   larger spread wash the text grid out to near-blank, which is precisely the
   comparison the reader is being asked to make. */
function rhoP(rho: number, n: number) {
  if (n < 4) return 1
  const z = Math.abs(rho) * Math.sqrt(n - 1)
  // Abramowitz & Stegun 7.1.26 erf approximation
  const t = 1 / (1 + 0.3275911 * (z / Math.SQRT2))
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-((z / Math.SQRT2) ** 2))
  return Math.max(0, Math.min(1, 1 - erf))
}

function spearman(a: number[], b: number[]) {
  const rank = (xs: number[]) => {
    const order = xs.map((v, i) => [v, i] as const).sort((p, q) => p[0] - q[0])
    const r = new Array(xs.length).fill(0)
    order.forEach(([, i], k) => { r[i] = k })
    return r
  }
  const A = rank(a); const B = rank(b); const n = a.length
  const ma = A.reduce((x, y) => x + y, 0) / n
  const mb = B.reduce((x, y) => x + y, 0) / n
  const num = A.reduce((acc, _, i) => acc + (A[i] - ma) * (B[i] - mb), 0)
  const den = Math.sqrt(A.reduce((acc, v) => acc + (v - ma) ** 2, 0) * B.reduce((acc, v) => acc + (v - mb) ** 2, 0))
  return num / den
}

function Scatter({ pts, xLabel, yLabel, rho, n, hover, setHover, accent, focus, yDomain }: {
  pts: { x: number; y: number; cv: string; label: string }[]
  xLabel: string
  yLabel: string
  rho: number
  /* how many prompts the correlation is over, so the reader can judge the p below */
  n: number
  hover: number | null
  setHover: (i: number | null) => void
  accent: string
  /* a country cv from the legend, or null: matching dots stay, the rest fade */
  focus?: string | null
  /* a shared [lo, hi] for the VERTICAL axis of both panels, wide enough to hold the
     selected model and SD 2.1's published baseline. Without it each panel rescaled
     itself on every switch, so a dot's height meant something different in each
     plot and nothing could be compared. The horizontal axes keep their own ranges —
     they measure different quantities. */
  yDomain?: [number, number]
}) {
  const W = 430
  const H = 330
  const padL = 60
  const padB = 52
  const padT = 16
  const padR = 14
  const xs = pts.map((p) => p.x); const ys = pts.map((p) => p.y)
  const [x0, x1] = [Math.min(...xs) - 0.02, Math.max(...xs) + 0.02]
  const [y0, y1] = yDomain ?? [Math.min(...ys) - 0.02, Math.max(...ys) + 0.02]
  const X = (v: number) => padL + ((v - x0) / (x1 - x0)) * (W - padL - padR)
  const Y = (v: number) => padT + (1 - (v - y0) / (y1 - y0)) * (H - padT - padB)
  const nPts = pts.length
  const mx = xs.reduce((a, b) => a + b, 0) / nPts
  const my = ys.reduce((a, b) => a + b, 0) / nPts
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0)
  const at = (x: number) => my + slope * (x - mx)
  const ticks = (lo: number, hi: number) => niceTicks(lo, hi, 3)
  const magnet = useMagnet(
    pts.map((p, i) => ({ x: X(p.x), y: Y(p.y), item: i })),
    (i) => setHover(i)
  )

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair" {...magnet}>
        {ticks(y0, y1).map((v) => (
          <g key={`y${v}`}>
            <line x1={padL} x2={W - padR} y1={Y(v)} y2={Y(v)} stroke="hsl(var(--grid))" strokeDasharray="3 5" />
            <text x={padL - 7} y={Y(v) + 3} textAnchor="end" fontSize="9" fill="hsl(var(--svg-fg))" fontFamily={MONO}>{v.toFixed(2)}</text>
          </g>
        ))}
        {ticks(x0, x1).map((v) => (
          <text key={`x${v}`} x={X(v)} y={H - padB + 16} textAnchor="middle" fontSize="9" fill="hsl(var(--svg-fg))" fontFamily={MONO}>{v.toFixed(2)}</text>
        ))}
        {/* drawn across the data's own span, so a shared frame never makes the fit
            look like it predicts territory with no points in it */}
        <line
          x1={X(Math.min(...xs))}
          x2={X(Math.max(...xs))}
          y1={Y(at(Math.min(...xs)))}
          y2={Y(at(Math.max(...xs)))}
          stroke={rgb(accent)}
          strokeWidth="2.5"
          strokeDasharray="6 4"
        />
        {hover !== null && pts[hover] && (
          <g pointerEvents="none">
            <line x1={padL} x2={W - padR} y1={Y(pts[hover].y)} y2={Y(pts[hover].y)} stroke="hsl(var(--foreground) / 0.18)" />
            <line x1={X(pts[hover].x)} x2={X(pts[hover].x)} y1={padT} y2={H - padB} stroke="hsl(var(--foreground) / 0.18)" />
          </g>
        )}
        {pts.map((p, i) => {
          const dim = focus != null && focus !== p.cv
          return (
            <circle
              key={i}
              cx={X(p.x)} cy={Y(p.y)}
              r={hover === i ? 7 : dim ? 2.5 : 4}
              fill={rgb(p.cv)} fillOpacity={dim ? 0.12 : hover === i ? 1 : 0.6}
              stroke={hover === i ? 'white' : 'none'}
              pointerEvents="none"
            />
          )
        })}
        <text x={(W + padL) / 2} y={H - 24} textAnchor="middle" fontSize="9.5" fill="hsl(var(--svg-fg))" fontFamily={MONO}>{xLabel}</text>
        <text x={14} y={(H - padB + padT) / 2} fontSize="9.5" fill="hsl(var(--svg-fg))" fontFamily={MONO}
          transform={`rotate(-90 14 ${(H - padB + padT) / 2})`} textAnchor="middle">{yLabel}</text>
      </svg>
      <div className="mt-1 flex items-baseline gap-3">
        <span className="font-mono2 text-2xl" style={{ color: rgb(accent) }}>{rho.toFixed(2)}</span>
        <span className="font-mono2 text-[10px] leading-4 text-foreground/50">
          {rhoP(rho, n) < 0.05 ? 'a real relationship' : 'nothing that clears chance'}
          <br />
          <span className="text-foreground/40">
            p = {rhoP(rho, n) < 0.001 ? '<0.001' : rhoP(rho, n).toFixed(3)} over {n} prompts
          </span>
        </span>
      </div>
    </div>
  )
}

/* Scene 11 · not copied from the data (F13) — DISMISSED 2026-08-06. The component
   stays in the tree as a named export so the file still compiles; it is no longer
   mounted (see the default export at the bottom). */

export function LaionScene() {
  const { model } = useModel()
  const [hoverA, setHoverA] = useState<number | null>(null)
  const [hoverB, setHoverB] = useState<number | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  /* The output side can be re-measured with the second ruler; the LAION side
     cannot follow the model switch at all, which the note below says outright. */
  const [ruler, setRuler] = useState<Ruler>('dinov3')

  /* The output side follows the model switch — that is each model's own homogeneity,
     which is a real measurement for all seven. The retrieval side cannot follow it:
     those neighbourhoods come from LAION, and only SD 2.1 (roughly SDXL) was trained
     on it, so the x axis stays fixed and the note above says why. */
  const rows = LAION.rows.map((r) => {
    const code = (r.country === 'default' ? 'default' : r.country) as Code | 'default'
    const sit = r.situation as Sit
    const isSd = isSd21(model)
    return {
      label: `“a ${r.situation}${r.country === 'default' ? '' : ` in ${r.country}`}”`,
      cv: r.country === 'default' ? '--c-gray' : C8[r.country as Code]?.cv ?? '--c-gray',
      training: r.retrieval_intraset_sim,
      output: isSd && ruler === 'dinov3' ? r.output_intraset_sim : xmIntraset(model, sit, code, ruler).mean,
      isDefault: code === 'default',
      /* null, not 0, for the six no-country prompts. A default cell's "distance from
         the default prompt" is not a measurement — it is the same prompt compared with
         itself. Writing 0 put six points at exactly x=0 that were also the least
         homogeneous, which inflated the correlation on the panel whose entire job is to
         show what a real relationship looks like (review 01 · R5.2). Panel B is n=48. */
      moved: code === 'default' ? null : xmDist(model, sit, code, ruler).mean,
    }
  })
  const ptsA = rows.map((r) => ({ x: r.training, y: r.output, cv: r.cv, label: r.label }))
  const rowsB = rows.filter((r) => r.moved != null) as (typeof rows[number] & { moved: number })[]
  const ptsB = rowsB.map((r) => ({ x: r.moved, y: r.output, cv: r.cv, label: r.label }))
  /* every value both panels draw, on one scale: the LAION neighbourhoods, this
     model's output homogeneity, and how far its prompts moved */
  const yDomain = useMemo(() => {
    /* the selected model's homogeneity AND SD 2.1's published values, so the frame
       holds both and switching model moves the dots inside a scale that stays put */
    const all = [...rows.map((r) => r.output), ...LAION.rows.map((r) => r.output_intraset_sim)]
    const lo = Math.min(...all)
    const hi = Math.max(...all)
    const pad = (hi - lo) * 0.06
    return [lo - pad, hi + pad] as [number, number]
  }, [rows])
  const rhoA = isSd21(model) && ruler === 'dinov3' ? LAION.rho : spearman(rows.map((r) => r.training), rows.map((r) => r.output))
  const rhoB = spearman(rowsB.map((r) => r.moved), rowsB.map((r) => r.output))

  return (
    <SceneShell
      number="11"
      kicker="Part IV · the mechanism · finding 13"
      title={<>The narrowness is the model's own, <em className="font-display italic text-amber-200">not copied.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          The last innocent explanation: perhaps the model simply reflects its training data. If Nigerian weddings
          online all look alike, a model that produces near-identical ones is being accurate, not stereotyping.
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-8">
          <HowItWorks
            steps={[
              { k: 'what we did', v: 'For each of the 54 prompts we searched a 503,000-image slice of LAION, the kind of web-scraped set these models learn from, and pulled the 50 nearest training images.' },
              { k: 'what we measured', v: "How alike those 50 training neighbours are to each other, and how alike the model's own 50 outputs are to each other." },
              { k: 'the comparison', v: 'The right panel plots the country prompts against something that does predict them.' },
            ]}
          />
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-5">
            <p className="max-w-lg font-mono2 text-[10px] leading-4 text-foreground/50">
              LAION is Stable Diffusion 2.1's training source, so on any other model the left panel asks whether{' '}
              <em>this</em> model's narrowness tracks <em>a different</em> model's training data.
            </p>
            <MetricToggle value={ruler} onChange={setRuler} />
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="font-mono2 text-[11px] text-foreground/70">the inheritance explanation</div>
              <div className="font-mono2 text-[10px] leading-4 text-foreground/45">
                if it held, narrow training neighbourhoods would produce narrow output
              </div>
              <div className="mt-3">
                <Scatter
                  pts={ptsA}
                  xLabel="how alike the LAION neighbours are →"
                  yLabel="how alike this model's output is →"
                  rho={rhoA}
                  n={rows.length}
                  hover={hoverA}
                  setHover={setHoverA}
                  accent="--c-gray"
                  focus={focus}
                  yDomain={yDomain}
                />
              </div>
              <p className="mt-2 min-h-[32px] font-mono2 text-[10px] leading-4 text-foreground/50">
                {hoverA !== null
                  ? `${rows[hoverA].label} · training neighbours ${rows[hoverA].training.toFixed(2)} · output ${rows[hoverA].output.toFixed(2)}`
                  : ' '}
              </p>
            </div>

            <div>
              <div className="font-mono2 text-[11px] text-foreground/70">what a real relationship looks like here</div>
              <div className="font-mono2 text-[10px] leading-4 text-foreground/40">
                the {rowsB.length} country prompts, plotted against how far the prompt moved the pictures
              </div>
              <div className="mt-3">
                <Scatter
                  pts={ptsB}
                  xLabel="how far the prompt moved this model's pictures →"
                  yLabel="how alike this model's output is →"
                  rho={rhoB}
                  n={rowsB.length}
                  hover={hoverB}
                  setHover={setHoverB}
                  accent="--c-amber"
                  focus={focus}
                  yDomain={yDomain}
                />
              </div>
              <p className="mt-2 min-h-[32px] font-mono2 text-[10px] leading-4 text-foreground/50">
                {hoverB !== null
                  ? `${rowsB[hoverB].label} · moved ${rowsB[hoverB].moved.toFixed(2)} · output ${rowsB[hoverB].output.toFixed(2)}`
                  : ' '}
              </p>
            </div>
          </div>

          {/* one legend for both panels: every dot is one of the 54 prompts, coloured
              by the country in it, and hovering a country isolates it in both clouds */}
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border pt-4">
            {[{ id: 'default', name: 'default prompt', cv: '--c-gray' }, ...COUNTRY8.map((c) => ({ id: c.id as string, name: c.name, cv: c.cv }))].map((e) => {
              const dim = focus != null && focus !== e.cv
              return (
                <button
                  key={e.id}
                  onMouseEnter={() => setFocus(e.cv)}
                  onMouseLeave={() => setFocus(null)}
                  onClick={() => setFocus(focus === e.cv ? null : e.cv)}
                  className={`flex items-center gap-1.5 font-mono2 text-[10px] transition hover:text-foreground/80 ${dim ? 'text-foreground/25' : 'text-foreground/50'}`}
                >
                  <span className="h-2 w-2 rounded-full transition" style={{ background: rgb(e.cv), opacity: dim ? 0.3 : 1 }} />
                  {e.name}
                </button>
              )
            })}
            <span className="font-mono2 text-[9px] text-foreground/30">
              one dot = one of the 54 prompts · hover to isolate
            </span>
          </div>

          <div className="mt-5 border-t border-border pt-5">
            <p className="max-w-3xl text-sm leading-6 text-foreground/70">
              The six no-country prompts drop out of the right panel: a default prompt has no distance from itself.
              Whatever narrows these outputs is clearly measurable (the right panel finds it easily). It is simply
              not the narrowness of the training neighbourhood. The same null holds on a second diversity measure
              ({LAION.vendiRho.toFixed(2)}, DINOv3 side), so it is not an artefact of how variety was counted.
            </p>
            <div className="mt-4">
              <TierNote tier="evidence" text={LAION.caveat} />
            </div>
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Part III ────────────────────────────────────────────────────────────── */

export default function Part2Mechanism() {
  return (
    <>
      <CommitEarlyScene />
      <TextEncoderScene />
      {/* Scene 11 (the LAION inheritance null) is DISMISSED, 2026-08-06. The
          component stays compiled above as a named export — restore
          <LaionScene /> here to bring it back. */}
    </>
  )
}
