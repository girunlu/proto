import { Fragment, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { ZoomImage, Picker, HowItWorks, useMagnet } from '../components/Viz'
import { rgb, rgba } from '../lib/colors'
import { C8, COUNTRY8, SITS, cell, seedImg, type Sit, type Code } from '../data/part1'
import {
  LOCKUP, LOCKUP_STEPS, stepKey, DIRECTIONS, HERO_DIRECTION, HERO_FIT,
  COMMITMENT, CFG, CFG_VALUES, MANTEL, NATIVE_MANTEL, MATRICES, LAION,
} from '../data/part2'
import { swapImgSeed, cfgImgCell } from '../data/uiv2'

const MONO = 'JetBrains Mono'
const SIT_OPTS = SITS.map((s) => ({ value: s, label: `a ${s}` }))
const CODE_OPTS = COUNTRY8.map((c) => ({ value: c.id, label: c.name }))

/* ── Scene 6 · the scene is settled early (F9) ───────────────────────────── */

function parseDirection(d: string): { sit: Sit; a: Code; b: Code } {
  const m = d.match(/^([a-z]+)_([A-Z]+)_to_([A-Z]+)$/)!
  return { sit: m[1] as Sit, a: m[2] as Code, b: m[3] as Code }
}

const pFlip = (k: number) => 1 / (1 + Math.exp(HERO_FIT.steepness * (k - HERO_FIT.step)))

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

  const fitPath = useMemo(() => {
    if (!isHero) return ''
    const out: string[] = []
    for (let s = 1; s <= 30; s += 0.25) out.push(`${out.length === 0 ? 'M' : 'L'}${x(s).toFixed(1)},${y(pFlip(s)).toFixed(1)}`)
    return out.join(' ')
  }, [isHero])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {isHero && (
        <>
          <rect x={x(HERO_FIT.ci[0])} y={padT} width={x(HERO_FIT.ci[1]) - x(HERO_FIT.ci[0])} height={H - padT - padB} fill={rgba('--c-amber', 0.08)} />
          <text x={(x(HERO_FIT.ci[0]) + x(HERO_FIT.ci[1])) / 2} y={padT + 11} textAnchor="middle" fontSize="9" fill={rgba('--c-amber-t', 0.85)} fontFamily={MONO}>
            the switchover: step {HERO_FIT.step} (95% CI {HERO_FIT.ci[0]}–{HERO_FIT.ci[1]})
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
      {isHero && (
        <motion.path d={fitPath} fill="none" stroke={rgb('--c-amber')} strokeWidth="2.5" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.6 }} />
      )}
      {pts.map((p, i) => (
        <motion.g key={p.s} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.12 }} onClick={() => onPick(p.s)} className="cursor-pointer">
          <line x1={x(p.s)} x2={x(p.s)} y1={y(p.ci_low)} y2={y(p.ci_high)} stroke={isHero ? rgb('--c-amber') : 'hsl(var(--foreground) / 0.6)'} strokeWidth="1.5" />
          <circle cx={x(p.s)} cy={y(p.p_closer_B)} r={p.s === activeStep ? 7 : 4.5} fill={isHero ? rgb('--c-amber') : 'hsl(var(--foreground) / 0.7)'} stroke={rgb('--bg')} strokeWidth="2" />
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
  const pt = LOCKUP[direction].curve[stepKey(step)]
  const committed = pt.p_closer_B < 0.5
  const dirOpts = dirsFor(sit).map((d) => {
    const p = parseDirection(d)
    return { value: d, label: `${C8[p.a].name} → ${C8[p.b].name}` }
  })

  return (
    <SceneShell
      number="06"
      kicker="Part II · the mechanism · finding 9"
      title={<>Which country it depicts is settled in the <em className="font-display italic text-amber-200">first third</em> of drawing.</>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          An image is drawn in 30 steps, from pure noise to a picture. So we interrupted it. Generation starts on one
          prompt and, at step k, we quietly swap the prompt for another country's. If the finished image still looks
          like the first country, the cultural identity had already been decided before we intervened. Pick an event
          and a direction, then drag the step slider and watch the middle image change.
        </p>
      </Reveal>

      <Reveal delay={0.06}>
        <Panel className="mt-10">
          <div className="flex flex-wrap items-end gap-4">
            <Picker label="event" value={sit} onChange={setSituation} options={SIT_OPTS} />
            <Picker label="swap direction" value={direction} onChange={setDirection} options={dirOpts} width="w-56" />
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
                <span className="text-foreground/40">what the new prompt draws on its own</span>
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
            <div className="mt-1.5 flex justify-between font-mono2 text-[10px] text-foreground/35">
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
                  <span className="text-foreground/35">layout, setting, cultural content</span>
                </div>
                <div className={`px-3 py-2 text-center transition ${step > 10 && step <= 20 ? 'bg-amber-300/15 text-amber-200' : 'text-foreground/40'}`}>
                  steps 10–20 · structure<br />
                  <span className="text-foreground/35">objects, people, poses</span>
                </div>
                <div className={`px-3 py-2 text-center transition ${step > 20 ? 'bg-amber-300/15 text-amber-200' : 'text-foreground/40'}`}>
                  steps 20–30 · texture<br />
                  <span className="text-foreground/35">fabric, skin, detail</span>
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
            For wedding · Nigeria → USA the crossover lands at step <strong>{HERO_FIT.step} of 30</strong>: the orange
            curve is the fitted prediction, the dots are the twelve-seed measurements it was fitted to. By the time the
            picture has any recognisable shape at all, the question of which country it depicts has been answered.
            Timing is early in all 24 tested directions; what varies between them is the size of the visual gap, not
            when it closes.
          </p>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Scene 7 · coarse to fine (F10) ──────────────────────────────────────── */

function CoarseFineScene() {
  const lanes = [
    { label: 'the whole scene', step: COMMITMENT.scene.mean, cv: '--c-sky', ex: 'indoors or outdoors, the setting, the architecture', n: `${COMMITMENT.scene.n} attributes` },
    { label: 'cultural identity', step: HERO_FIT.step, cv: '--c-amber', ex: 'which country the picture reads as', n: 'wedding · Nigeria → USA' },
    { label: 'surface detail', step: COMMITMENT.texture.mean, cv: '--c-vio', ex: 'attire, headwear, fabric', n: `${COMMITMENT.texture.n} attributes` },
    { label: 'how many people', step: COMMITMENT.peopleCount.mean, cv: '--c-gray', ex: 'rarely settles cleanly at all', n: 'reported separately' },
  ]
  return (
    <SceneShell
      number="07"
      kicker="Part II · the mechanism · finding 10"
      title={<>Settled <em className="font-display italic text-amber-200">coarse first, fine later.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          Not everything is decided at once. Running the same interrupted-generation machinery attribute by attribute
          ({COMMITMENT.nLogistic} clean fits, {COMMITMENT.nFallback} estimated from intervals): the model settles{' '}
          <strong>where and what kind of event</strong> around step {COMMITMENT.scene.mean}, and{' '}
          <strong>what people are wearing</strong> around step {COMMITMENT.texture.mean}. Both are done before the
          image is half-drawn.
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            where each kind of decision lands on the 30-step trajectory
          </div>
          <div className="mt-8 space-y-3">
            {lanes.map((m, i) => (
              <div key={m.label} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-right font-mono2 text-[11px] leading-4" style={{ color: rgb(m.cv) }}>
                  {m.label}
                </span>
                <div className="relative h-9 flex-1 rounded-md bg-foreground/5">
                  <div className="absolute inset-y-0 left-0 rounded-l-md bg-gradient-to-r from-foreground/10 to-transparent" style={{ width: '15%' }} />
                  <motion.div
                    className="absolute top-1/2 h-6 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ left: `${(m.step / 30) * 100}%`, background: rgb(m.cv) }}
                    initial={{ opacity: 0, scaleY: 0 }}
                    whileInView={{ opacity: 1, scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 + i * 0.12 }}
                  />
                  <motion.span
                    className="absolute top-1/2 -translate-y-1/2 font-mono2 text-[11px]"
                    style={{ left: `calc(${(m.step / 30) * 100}% + 10px)`, color: rgb(m.cv) }}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.35 + i * 0.12 }}
                  >
                    step {m.step}
                  </motion.span>
                </div>
                <span className="w-56 shrink-0 font-mono2 text-[10px] leading-4 text-foreground/45">
                  {m.ex}
                  <br />
                  <span className="text-foreground/30">{m.n}</span>
                </span>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-1">
              <span className="w-36 shrink-0" />
              <div className="flex flex-1 justify-between font-mono2 text-[10px] text-foreground/35">
                <span>step 1 · pure noise</span>
                <span>step 15</span>
                <span>step 30 · finished image</span>
              </div>
              <span className="w-56 shrink-0" />
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-5">
            <TierNote
              tier="evidence"
              text="Per-attribute fits on the interrupted-generation data : scene-level attributes settle at a mean step of 11.41, texture-level ones at 12.23. People-count is shown greyed because it rarely produces a clean crossing at all. That reads as a general counting weakness rather than cultural commitment, so we report it separately rather than folding it into the average."
            />
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Scene 8 · the knob that doesn't help (F11) ──────────────────────────── */

function CfgChart({ situation, highlight }: { situation: Sit; highlight: Code | null }) {
  const W = 900
  const H = 340
  const padL = 40
  const padB = 30
  const padT = 12
  const padR = 12
  const xMax = 15
  const yMax = 0.6
  const x = (cfg: number) => padL + (cfg / xMax) * (W - padL - padR)
  const y = (d: number) => padT + (1 - d / yMax) * (H - padT - padB)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 0.2, 0.4, 0.6].map((v) => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="hsl(var(--grid))" strokeDasharray="3 4" />
          <text x={padL - 6} y={y(v) + 4} textAnchor="end" fontSize="9" fill="hsl(var(--svg-fg))" fontFamily={MONO}>
            {v.toFixed(1)}
          </text>
        </g>
      ))}
      {CFG_VALUES.map((v) => (
        <text key={v} x={x(v)} y={H - 12} textAnchor="middle" fontSize="9" fill="hsl(var(--svg-fg))" fontFamily={MONO}>
          {v}
        </text>
      ))}
      <text x={W / 2} y={H - 1} textAnchor="middle" fontSize="9" fill="hsl(var(--svg-fg))" fontFamily={MONO}>
        guidance strength (CFG): how hard the model is pushed to obey the prompt
      </text>
      {COUNTRY8.map((c, ci) => {
        const pts = CFG_VALUES.map((v) => ({ cfg: v, d: CFG[situation][c.id][String(v)].mean }))
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.cfg)},${y(p.d)}`).join(' ')
        const on = highlight === null || c.id === highlight
        return (
          <g key={c.id}>
            <motion.path
              d={path}
              fill="none"
              stroke={rgb(c.cv)}
              strokeWidth={on ? 2.5 : 1.25}
              strokeOpacity={on ? 1 : 0.3}
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, delay: ci * 0.06 }}
            />
            {pts.map((p) => (
              <circle key={p.cfg} cx={x(p.cfg)} cy={y(p.d)} r={on ? 4 : 2} fill={rgb(c.cv)} fillOpacity={on ? 1 : 0.3} />
            ))}
          </g>
        )
      })}
      <motion.g initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1 }}>
        <line x1={x(4)} x2={x(4)} y1={y(0)} y2={y(0.6)} stroke={rgba('--c-amber', 0.45)} strokeDasharray="4 4" />
        <text x={x(4.4)} y={y(0.56)} fontSize="9" fill={rgb('--c-amber-t')} fontFamily={MONO}>
          the gap has already opened by CFG 4
        </text>
      </motion.g>
    </svg>
  )
}

function CfgScene() {
  const [situation, setSituation] = useState<Sit>('wedding')
  const [code, setCode] = useState<Code>('IN')
  // null = nothing singled out, every line drawn at equal weight
  const [focus, setFocus] = useState<Code | null>('IN')
  const shown = [1, 4, 12, 15]
  return (
    <SceneShell
      number="08"
      kicker="Part II · the mechanism · finding 11"
      title={<>The knob that <em className="font-display italic text-amber-200">doesn't help.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          Every image tool has a guidance slider: turn it up and the model is pushed harder to obey the words you
          typed. If the cultural gap were a matter of the model half-listening, pushing harder would close it. It does
          not. The gap opens almost entirely between guidance 1 and 4, then sits flat all the way to 15, in every one
          of the six events.
        </p>
      </Reveal>
      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="flex flex-wrap items-end gap-4">
            <Picker label="event" value={situation} onChange={setSituation} options={SIT_OPTS} />
            <Picker label="country" value={code} onChange={(v) => { setCode(v); setFocus(v) }} options={CODE_OPTS} accent={C8[code].cv} />
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
                distance from the plain prompt at each guidance level
              </div>
              <button
                onClick={() => setFocus(null)}
                className={`rounded border px-2 py-0.5 font-mono2 text-[10px] transition ${focus === null ? 'border-amber-300/50 text-amber-200' : 'border-border text-foreground/45 hover:text-foreground'}`}
              >
                show all countries equally
              </button>
            </div>
            <CfgChart situation={situation} highlight={focus} />
            {/* fixed legend column: the country labels used to sit at the line
                ends and jumped around whenever the lines crossed */}
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
              {COUNTRY8.map((c) => {
                const end = CFG[situation][c.id]['15'].mean
                const on = focus === null || focus === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => { setFocus(focus === c.id ? null : c.id); setCode(c.id) }}
                    className={`flex items-center justify-between gap-2 rounded px-1.5 py-0.5 font-mono2 text-[10px] transition ${focus === c.id ? 'bg-foreground/10' : on ? '' : 'opacity-45 hover:opacity-100'}`}
                  >
                    <span className="flex items-center gap-1.5" style={{ color: rgb(c.cv) }}>
                      <span className="h-0.5 w-4 rounded-full" style={{ background: rgb(c.cv) }} />
                      {c.name}
                    </span>
                    <span className="text-foreground/45">{end.toFixed(2)}</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-2 font-mono2 text-[10px] text-foreground/35">
              click a country to single it out, click it again (or the button above) to bring every line back to equal weight
            </p>
          </div>

          <div className="mt-8 border-t border-border pt-5">
            <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
              “a {situation} in {C8[code].name}” · the same request, asked more and more forcefully
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {shown.map((v) => (
                <figure key={v}>
                  <ZoomImage
                    src={cfgImgCell(situation, code, v)}
                    alt={`a ${situation} in ${C8[code].name} at guidance ${v}`}
                    caption={`“a ${situation} in ${C8[code].name}” · guidance ${v} · seed 0`}
                    imgClassName="aspect-square w-full cursor-zoom-in rounded-lg border border-border object-cover"
                  />
                  <figcaption className="mt-1.5 font-mono2 text-[10px] text-foreground/45">
                    guidance {v}
                    {v === 1 && <span className="text-foreground/30"> · barely listening</span>}
                    {v === 15 && <span className="text-foreground/30"> · pushed as hard as it goes</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-2 font-mono2 text-[9px] text-foreground/35">same seed throughout, so any change is the guidance and nothing else</p>
          </div>

          <div className="mt-6 grid gap-4 border-t border-border pt-5 md:grid-cols-2">
            <TierNote
              tier="evidence"
              text="Distance from the plain prompt at each guidance level, 50 seeds per point with bootstrap confidence intervals. It holds in all six events; wedding × Nigeria is the flattest of all, 0.491 at guidance 4 and 0.488 at guidance 15."
            />
            <p className="text-sm leading-6 text-foreground/60">
              An honest caveat: the near-default lines (USA, Germany) look flat partly because there is barely a gap
              there to open. The finding is about the far lines. No amount of guidance closes those.
            </p>
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Scene 9 · not the text encoder (F12) ────────────────────────────────── */

/* Each grid is scaled to its OWN range. Sharing one scale let the image grid's
   larger spread wash the text grid out to near-blank, which is precisely the
   comparison the reader is being asked to make. */
function BigMatrix({ m, kind, title, sub }: {
  m: NonNullable<(typeof MATRICES)['wedding']>
  kind: 'txt' | 'img'
  title: string
  sub: string
}) {
  const mat = kind === 'txt' ? m.txt_txt : m.img_img_collapsed
  const labels = m.countries
  const [hover, setHover] = useState<{ i: number; j: number } | null>(null)
  const cv = kind === 'txt' ? '--c-sky' : '--c-red'

  const dists = mat.flatMap((row, i) => row.map((v, j) => (i === j ? null : 1 - v))).filter((v): v is number => v !== null)
  const lo = Math.min(...dists)
  const hi = Math.max(...dists)
  const norm = (d: number) => (hi === lo ? 0.5 : (d - lo) / (hi - lo))

  return (
    <div>
      <div className="font-mono2 text-[11px]" style={{ color: rgb(cv) }}>{title}</div>
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
      <p className="mt-1 font-mono2 text-[9px] leading-4 text-foreground/35">
        nearest and furthest pair in <em>this</em> grid. Each grid is shaded over its own range, so read the
        <em> pattern</em> across the two, not the raw colour.
      </p>
      {hover && hover.i !== hover.j && (
        <p className="mt-1.5 font-mono2 text-[10px] text-foreground/55">
          {labels[hover.i] === 'default' ? 'the plain prompt' : labels[hover.i]} vs{' '}
          {labels[hover.j] === 'default' ? 'the plain prompt' : labels[hover.j]}:{' '}
          <strong className="text-foreground/80">{(1 - mat[hover.i][hover.j]).toFixed(3)}</strong> apart
        </p>
      )}
    </div>
  )
}

function TextEncoderScene() {
  const [sit, setSit] = useState<Sit>('wedding')
  const m = MATRICES[sit]!
  const mantelRows = SITS.map((s) => ({ sit: s,...MANTEL[s] }))
  const best = Math.max(...mantelRows.map((r) => r.r))
  const sigCount = mantelRows.filter((r) => r.p < 0.05).length
  return (
    <SceneShell
      number="09"
      kicker="Part II · the mechanism · finding 12"
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
        <div className="mt-8">
          <HowItWorks
            steps={[
              { k: 'what we compared', v: 'For one event we take all nine prompts and measure how far apart they are, twice: once as sentences in the text encoder, once as the 50-image sets they actually produce.' },
              { k: 'what would settle it', v: 'If the picture geometry were inherited from the sentence geometry, the two grids below would have the same shape: same pairs near, same pairs far.' },
              { k: 'the test', v: 'A Mantel test compares two distance grids and returns r, from 0 (no shared shape) to 1 (identical shape). Its p-value comes from reshuffling the labels 10,000 times.' },
            ]}
          />
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
              the same nine prompts, measured two ways
            </div>
            <Picker
              label="event"
              value={sit}
              onChange={setSit}
              options={(Object.keys(MATRICES) as Sit[]).map((s) => ({ value: s, label: `a ${s}` }))}
            />
          </div>
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <BigMatrix m={m} kind="txt" title="as sentences · before any image exists" sub="how far apart the nine prompts are, read as text" />
            <BigMatrix m={m} kind="img" title="as pictures · once they are drawn" sub="how far apart the nine 50-image sets are" />
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-foreground/60">
            Read one pair across both grids. In the sentence grid, “a {sit}” and “a {sit} in Nigeria” sit at a
            moderate distance, because they are, after all, mostly the same words. In the picture grid the same pair is
            dramatically farther apart. The separation is not carried in from the sentence. It is manufactured on the
            way to the image.
          </p>
        </Panel>
      </Reveal>

      <Reveal delay={0.1}>
        <Panel className="mt-6">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            does the sentence pattern predict the picture pattern?
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/60">
            Take the two grids above and ask a single question of them: <em>do they have the same shape?</em> Not
            whether the numbers match, they are on different scales, but whether the pairs that are near each other in
            one are the pairs that are near each other in the other. One bar per event. A long bar means the sentence
            distances and the picture distances rise and fall together, so the picture pattern could have been read off
            the prompt. A short bar means knowing the sentence pattern tells you nothing about the picture pattern.
          </p>
          <div className="mt-6 space-y-3">
            {mantelRows.map((r, i) => (
              <div key={r.sit} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-right font-mono2 text-xs text-foreground/60">a {r.sit}</span>
                <div className="relative h-5 flex-1 rounded-sm bg-foreground/5">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-sm"
                    style={{ background: r.p < 0.05 ? rgb('--c-amber') : 'hsl(var(--foreground) / 0.25)' }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.max(0, r.r) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: i * 0.07 }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right font-mono2 text-xs text-foreground/70">{r.r.toFixed(2)}</span>
                <span className="w-24 shrink-0 font-mono2 text-[10px] text-foreground/45">
                  {r.p < 0.05 ? `p = ${r.p}` : 'no relationship'}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-1">
              <span className="w-28 shrink-0" />
              <div className="flex flex-1 justify-between font-mono2 text-[10px] text-foreground/35">
                <span>0 · knowing one tells you nothing about the other</span>
                <span>1 · the same pattern exactly</span>
              </div>
              <span className="w-14 shrink-0" />
              <span className="w-24 shrink-0" />
            </div>
          </div>
          <div className="mt-6 grid gap-4 border-t border-border pt-5 md:grid-cols-2">
            <p className="text-sm leading-6 text-foreground/60">
              Only {sigCount} of the six events show any relationship at all, and even in the strongest one the
              sentence pattern accounts for roughly <strong>{Math.round(best * best * 100)}%</strong> of the picture
              pattern. For the other events it is indistinguishable from no relationship, and “a wedding”, the case
              this whole page is built on, is one of them. Most of what separates the countries is added <em>after</em>{' '}
              the sentence has been read.
            </p>
            <div className="rounded-lg border border-emerald-300/25 bg-emerald-300/5 p-4">
              <div className="font-mono2 text-[10px] tracking-widest text-emerald-300/80 uppercase">
                and it is not this model's encoder
              </div>
              <p className="mt-2 text-sm leading-6 text-foreground/70">
                Re-run on six further models, each with its own, different text encoder:{' '}
                <strong>{NATIVE_MANTEL.significant} of {NATIVE_MANTEL.total}</strong> event × model combinations show a
                significant relationship. Whatever this is, it is not a quirk of one text encoder.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <TierNote tier="evidence" text="Mantel permutation tests on the collapsed 9×9 distance grids , 10,000 shuffles." />
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Scene 10 · not copied from the data (F13) ───────────────────────────── */

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

function Scatter({ pts, xLabel, yLabel, rho, hover, setHover, accent }: {
  pts: { x: number; y: number; cv: string; label: string }[]
  xLabel: string
  yLabel: string
  rho: number
  hover: number | null
  setHover: (i: number | null) => void
  accent: string
}) {
  const W = 430
  const H = 330
  const padL = 60
  const padB = 52
  const padT = 16
  const padR = 14
  const xs = pts.map((p) => p.x); const ys = pts.map((p) => p.y)
  const x0 = Math.min(...xs) - 0.02; const x1 = Math.max(...xs) + 0.02
  const y0 = Math.min(...ys) - 0.02; const y1 = Math.max(...ys) + 0.02
  const X = (v: number) => padL + ((v - x0) / (x1 - x0)) * (W - padL - padR)
  const Y = (v: number) => padT + (1 - (v - y0) / (y1 - y0)) * (H - padT - padB)
  const n = pts.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0)
  const at = (x: number) => my + slope * (x - mx)
  const ticks = (lo: number, hi: number) => [0.25, 0.5, 0.75].map((f) => lo + f * (hi - lo))
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
        <line x1={X(x0)} x2={X(x1)} y1={Y(at(x0))} y2={Y(at(x1))} stroke={rgb(accent)} strokeWidth="2.5" strokeDasharray="6 4" />
        {hover !== null && pts[hover] && (
          <g pointerEvents="none">
            <line x1={padL} x2={W - padR} y1={Y(pts[hover].y)} y2={Y(pts[hover].y)} stroke="hsl(var(--foreground) / 0.18)" />
            <line x1={X(pts[hover].x)} x2={X(pts[hover].x)} y1={padT} y2={H - padB} stroke="hsl(var(--foreground) / 0.18)" />
          </g>
        )}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={X(p.x)} cy={Y(p.y)}
            r={hover === i ? 7 : 4}
            fill={rgb(p.cv)} fillOpacity={hover === i ? 1 : 0.6}
            stroke={hover === i ? 'white' : 'none'}
            pointerEvents="none"
          />
        ))}
        <text x={(W + padL) / 2} y={H - 24} textAnchor="middle" fontSize="9.5" fill="hsl(var(--svg-fg))" fontFamily={MONO}>{xLabel}</text>
        <text x={14} y={(H - padB + padT) / 2} fontSize="9.5" fill="hsl(var(--svg-fg))" fontFamily={MONO}
          transform={`rotate(-90 14 ${(H - padB + padT) / 2})`} textAnchor="middle">{yLabel}</text>
      </svg>
      <div className="mt-1 flex items-baseline gap-3">
        <span className="font-mono2 text-2xl" style={{ color: rgb(accent) }}>{rho.toFixed(2)}</span>
        <span className="font-mono2 text-[10px] leading-4 text-foreground/45">
          {Math.abs(rho) < 0.2 ? 'no usable relationship' : 'a clear relationship'}
          <br />
          <span className="text-foreground/30">slope of the dashed line: {slope > 0 ? 'rising' : 'flat to falling'}</span>
        </span>
      </div>
    </div>
  )
}

function LaionScene() {
  const [hoverA, setHoverA] = useState<number | null>(null)
  const [hoverB, setHoverB] = useState<number | null>(null)

  const rows = LAION.rows.map((r) => {
    const code = (r.country === 'default' ? 'default' : r.country) as Code | 'default'
    const c = cell(r.situation as Sit, code)
    return {
      label: `“a ${r.situation}${r.country === 'default' ? '' : ` in ${r.country}`}”`,
      cv: r.country === 'default' ? '--c-gray' : C8[r.country as Code]?.cv ?? '--c-gray',
      training: r.retrieval_intraset_sim,
      output: r.output_intraset_sim,
      moved: c?.dist?.mean ?? 0,
    }
  })
  const ptsA = rows.map((r) => ({ x: r.training, y: r.output, cv: r.cv, label: r.label }))
  const ptsB = rows.map((r) => ({ x: r.moved, y: r.output, cv: r.cv, label: r.label }))
  const rhoB = spearman(rows.map((r) => r.moved), rows.map((r) => r.output))

  return (
    <SceneShell
      number="10"
      kicker="Part II · the mechanism · finding 13"
      title={<>The narrowness is the model's own, <em className="font-display italic text-amber-200">not copied.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          The last innocent explanation: perhaps the model is simply reflecting its training data. If the pictures of
          Nigerian weddings on the internet all look alike, then a model that produces near-identical Nigerian weddings
          is being accurate, not stereotyping.
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-8">
          <HowItWorks
            steps={[
              { k: 'what we did', v: 'For each of the 54 prompts we searched a 503,000-image slice of LAION, the kind of web-scraped set these models learn from, and pulled the 50 nearest training images.' },
              { k: 'what we measured', v: "How alike those 50 training neighbours are to each other, and how alike the model's own 50 outputs are to each other. One dot below is one prompt." },
              { k: 'how to read it', v: 'A number near 1 means the left quantity predicts the upward one. A number near 0 means it tells you nothing. To make that concrete, the second panel plots the same 54 outputs against something that does predict them.' },
            ]}
          />
        </div>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="font-mono2 text-[11px] text-foreground/70">the inheritance explanation</div>
              <div className="font-mono2 text-[10px] leading-4 text-foreground/40">
                if it held, narrow training neighbourhoods would produce narrow output
              </div>
              <div className="mt-3">
                <Scatter
                  pts={ptsA}
                  xLabel="how alike the training neighbours are →"
                  yLabel="how alike the output is →"
                  rho={LAION.rho}
                  hover={hoverA}
                  setHover={setHoverA}
                  accent="--c-gray"
                />
              </div>
              <p className="mt-2 min-h-[32px] font-mono2 text-[10px] leading-4 text-foreground/50">
                {hoverA !== null
                  ? `${rows[hoverA].label} · training neighbours ${rows[hoverA].training.toFixed(2)} · output ${rows[hoverA].output.toFixed(2)}`
                  : 'a shapeless cloud: the dashed best-fit line is flat'}
              </p>
            </div>

            <div>
              <div className="font-mono2 text-[11px] text-foreground/70">what a real relationship looks like here</div>
              <div className="font-mono2 text-[10px] leading-4 text-foreground/40">
                the same 54 outputs, plotted against how far the prompt moved the pictures
              </div>
              <div className="mt-3">
                <Scatter
                  pts={ptsB}
                  xLabel="how far the prompt moved the pictures →"
                  yLabel="how alike the output is →"
                  rho={rhoB}
                  hover={hoverB}
                  setHover={setHoverB}
                  accent="--c-amber"
                />
              </div>
              <p className="mt-2 min-h-[32px] font-mono2 text-[10px] leading-4 text-foreground/50">
                {hoverB !== null
                  ? `${rows[hoverB].label} · moved ${rows[hoverB].moved.toFixed(2)} · output ${rows[hoverB].output.toFixed(2)}`
                  : 'a cloud that climbs: the dashed line rises'}
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <p className="max-w-3xl text-sm leading-6 text-foreground/70">
              Both panels use the same 54 prompts and the same measure of output narrowness on the upward axis. Only
              the sideways axis differs. Whatever collapses these outputs is clearly measurable, since the right-hand
              panel finds it easily. It simply is not the narrowness of the training neighbourhood. The same null holds
              on a second diversity measure ({LAION.vendiRho.toFixed(2)}), so it is not an artefact of how we counted
              variety.
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

/* ── Part II ─────────────────────────────────────────────────────────────── */

export default function Part2Mechanism() {
  return (
    <>
      <CommitEarlyScene />
      <CoarseFineScene />
      <CfgScene />
      <TextEncoderScene />
      <LaionScene />
    </>
  )
}
