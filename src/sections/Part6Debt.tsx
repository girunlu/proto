import { useState } from 'react'
import { motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { rgb } from '../lib/colors'
import { C8, type Sit, type Code } from '../data/part1'
import { Q_TEXT } from '../data/uiv2'
import { useModel, MODEL_NAME, MODELS, type ModelId } from '../data/modelContext'
import {
  DEBT_SUMMARY, DEEPEST_LADDER, THRESHOLDS, debtSpread, debtRows, debtAt, median,
} from '../data/remedy'

const label = (key: string) => {
  const [sit, code] = key.split('_') as [Sit, Code | 'default']
  return code === 'default' ? `a ${sit}` : `a ${sit} in ${C8[code as Code]?.name ?? code}`
}

/* One model's 54 prompts as a strip of dots on a shared x-axis, with the cells that
   actually have a measured ladder ringed. The reader's takeaway is positional: the
   tested remedy sits at the far left of the required-work distribution. */
function Strip({ modelId, thr, hover, setHover, selected }: {
  modelId: ModelId
  thr: number
  hover: string | null
  setHover: (k: string | null) => void
  /* the row for the model chosen in the top bar. The chart deliberately shows all
     seven at once — comparison is the point — but with nothing marked, switching
     model appeared to do nothing at all. */
  selected?: boolean
}) {
  const rows = debtSpread(modelId, thr)
  const med = median(rows.map((r) => r.n))
  const W = 560
  const H = 34
  const pad = 8
  const MAX = 18
  const X = (n: number) => pad + (n / MAX) * (W - 2 * pad)

  /* jitter is deterministic — a hash of the cell key, not Math.random(), so the
     plot does not reshuffle itself on every re-render of the slider */
  const jitter = (k: string) => {
    let h = 0
    for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0
    return ((Math.abs(h) % 100) / 100 - 0.5) * (H - 16)
  }

  return (
    <div className={`flex items-center gap-3 rounded-md py-0.5 transition ${selected ? 'bg-amber-300/[0.07]' : ''}`}>
      <span
        className={`w-32 shrink-0 truncate text-right font-mono2 text-[10px] transition ${
          selected ? 'text-amber-200' : 'text-foreground/50'
        }`}
      >
        {MODEL_NAME[modelId]?.replace('Stable Diffusion', 'SD')}
      </span>
      <svg viewBox={`0 0 ${W} ${H}`} className="min-w-0 flex-1" role="img" aria-label={`${MODEL_NAME[modelId]}: median ${med} settled attributes per prompt`}>
        <line x1={X(DEEPEST_LADDER)} x2={X(DEEPEST_LADDER)} y1={0} y2={H} stroke={rgb('--c-amber')} strokeWidth={1} strokeDasharray="2 3" opacity={0.5} />
        {rows.map((r) => (
          <circle
            key={r.key}
            cx={X(r.n)}
            cy={H / 2 + jitter(r.key)}
            r={hover === r.key ? 5 : r.hasLadder ? 4 : 2.6}
            fill={r.hasLadder ? 'none' : rgb('--c-sky')}
            fillOpacity={hover === r.key ? 1 : 0.45}
            stroke={r.hasLadder ? rgb('--c-amber') : hover === r.key ? 'white' : 'none'}
            strokeWidth={1.5}
            pointerEvents="none"
          />
        ))}
        {/* soft hover: the visible dot is 2.6px, which is far too small to aim at, so
            each one carries an invisible 9px target. The pointer now "snaps" to the
            nearest prompt instead of the reader chasing a speck. */}
        {rows.map((r) => (
          <circle
            key={`hit-${r.key}`}
            cx={X(r.n)}
            cy={H / 2 + jitter(r.key)}
            r={9}
            fill="transparent"
            onMouseEnter={() => setHover(r.key)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: 'pointer' }}
          />
        ))}
        <line x1={X(med)} x2={X(med)} y1={2} y2={H - 2} stroke={rgb('--c-em')} strokeWidth={2} opacity={0.85} />
      </svg>
      <span className="w-8 shrink-0 font-mono2 text-[11px] text-emerald-300">{med}</span>
    </div>
  )
}

/* One guess before one reveal. State is local and nothing is stored or sent — the
   point is only that a reader who has committed to a number reads the next chart
   differently from one who has not. */
const GUESSES = [
  { v: '1-2', label: '1 or 2' },
  { v: '3-5', label: '3 to 5' },
  { v: '6-10', label: '6 to 10' },
  { v: '10+', label: 'more than 10' },
] as const

function Predict() {
  const [guess, setGuess] = useState<string | null>(null)
  const truth = median(MODELS.flatMap((m) => debtSpread(m.id, 0.8).map((r) => r.n)))
  const band = truth <= 2 ? '1-2' : truth <= 5 ? '3-5' : truth <= 10 ? '6-10' : '10+'

  return (
    <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-border bg-card/60 p-5">
      <p className="text-sm leading-6 text-foreground/75">
        Before you scroll, <strong>you type “a wedding in Nigeria”.</strong> How many things do you think the
        model decides on your behalf that you never mentioned?
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {GUESSES.map((g) => (
          <button
            key={g.v}
            onClick={() => setGuess(g.v)}
            aria-pressed={guess === g.v}
            className={`chip !px-3 !py-1.5 ${guess === g.v ? 'chip-active' : ''}`}
          >
            {g.label}
          </button>
        ))}
      </div>
      {guess && (
        <p className="mt-3 text-sm leading-6 text-foreground/70">
          {guess === band ? (
            <>You said <strong>{GUESSES.find((g) => g.v === guess)?.label}</strong>, and the median across all
            378 model-and-prompt pairs is <strong className="text-amber-200">{truth}</strong>. You are one of the
            few who guesses this right.</>
          ) : (
            <>You said <strong>{GUESSES.find((g) => g.v === guess)?.label}</strong>. The median across all 378
            model-and-prompt pairs is <strong className="text-amber-200">{truth}</strong>
            {['1-2', '3-5'].includes(guess) ? ', more than you expected, which is the usual direction.' : '.'}</>
          )}{' '}
          The deepest counter-specification ladder anyone has ever run is {DEEPEST_LADDER}.
        </p>
      )}
    </div>
  )
}

export default function Part6Debt() {
  const { model } = useModel()
  const [thr, setThr] = useState(0.8)
  const [hover, setHover] = useState<string | null>(null)

  const all = MODELS.flatMap((m) => debtSpread(m.id, thr).map((r) => r.n))
  const med = median(all)
  const worst = Math.max(...all)
  const hoverRows = hover ? debtRows(model, hover).filter((r) => r[2] >= Math.round(thr * 100)) : []

  return (
    <SceneShell
      number="16·a"
      kicker="Part VI · the escape and its price · the size of the bill"
      title={<>Before asking whether extra words work, ask <em className="font-display italic text-amber-200">how many you would need.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          Every prompt on this page settles a list of things nobody asked about. Counting them gives a floor on the
          number of clauses it would take to take them back, one clause per decision, at minimum, and usually more,
          because the clauses interact. That count is available for every prompt, on every model, which makes it the one
          part of the remedy argument that runs at the full width of the study rather than on ten ladders.
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <Predict />
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
              settled attributes per prompt · 7 models × 54 prompts
            </div>
            <div className="font-mono2 text-[10px] text-foreground/40">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full ring-1 ring-amber-300" />
              cells with a real ladder
            </div>
          </div>
          {/* the chart was unlabelled beyond its axis: readers could not tell what a
              dot, a row, or the green line stood for without reverse-engineering it. */}
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/60">
            One row per model, one dot per prompt, {MODELS.length} rows of 54. A dot sits at the number of things
            that model decided for that prompt without being asked, so <strong>further right means a bigger bill</strong>.
            The green line is that model's median; the dashed amber line is {DEEPEST_LADDER} clauses, the deepest
            counter-specification anyone has actually run. Almost every dot sits to the right of it. Ringed dots are the
            few prompts where a real ladder exists. Hover any dot to see what that prompt decided; the highlighted row
            is the model selected in the bar at the top.
          </p>

          <div className="mt-6 space-y-1.5">
            {MODELS.map((m) => (
              <Strip key={m.id} modelId={m.id} thr={thr} hover={hover} setHover={setHover} selected={m.id === model} />
            ))}
            <div className="flex items-center gap-3 pt-1">
              <span className="w-32 shrink-0" />
              <div className="relative min-w-0 flex-1 font-mono2 text-[9px] text-foreground/35">
                <span className="absolute left-0">0</span>
                <span className="absolute" style={{ left: `${(DEEPEST_LADDER / 18) * 100}%`, transform: 'translateX(-50%)' }}>
                  <span className="text-amber-200/70">{DEEPEST_LADDER}, deepest ladder ever run</span>
                </span>
                <span className="absolute right-0">18</span>
              </div>
              <span className="w-8 shrink-0" />
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <span className="shrink-0 font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
              count an attribute as settled at
            </span>
            <input
              type="range"
              min={0}
              max={THRESHOLDS.length - 1}
              step={1}
              value={THRESHOLDS.indexOf(thr)}
              onChange={(e) => setThr(THRESHOLDS[Number(e.target.value)])}
              className="h-1 min-w-[8rem] flex-1 cursor-pointer accent-amber-300"
              aria-label="consistency threshold"
            />
            <span className="w-28 shrink-0 font-mono2 text-sm text-amber-200">
              {Math.round(thr * 100)}% of seeds
            </span>
          </div>

          <div className="mt-6 grid gap-6 border-t border-border pt-6 md:grid-cols-[1fr_1.1fr]">
            <div>
              <div className="flex items-baseline gap-3">
                <motion.span key={med} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="font-mono2 text-5xl text-foreground">
                  {med}
                </motion.span>
                <span className="font-mono2 text-[11px] leading-4 text-foreground/45">
                  decisions to take back, median across all {all.length} model-and-prompt pairs<br />
                  up to {worst} on the worst one
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-foreground/70">
                Every ladder on this page stops at {DEEPEST_LADDER} clauses. Drag the slider: the median only falls below{' '}
                {DEEPEST_LADDER} when you demand that an attribute be settled on <em>every single seed</em>, and even
                then the bill is not zero. The bound is not an artifact of where the gate sits.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/50 p-4">
              <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
                {hover ? `${label(hover)} · ${MODEL_NAME[model]}` : 'hover a dot'}
              </div>
              {hover ? (
                <>
                  <div className="mt-1 font-mono2 text-[11px] text-amber-200">
                    {debtAt(model, hover, thr)} decisions made for you
                  </div>
                  <div className="mt-3 max-h-56 space-y-1 overflow-y-auto pr-1">
                    {hoverRows.map((r) => (
                      <div key={r[0]} className="flex items-baseline gap-2">
                        <span className="w-32 shrink-0 truncate font-mono2 text-[10px] text-foreground/45" title={Q_TEXT[r[0]] ?? r[0]}>
                          {Q_TEXT[r[0]] ?? r[0]}
                        </span>
                        <span className="truncate font-mono2 text-[11px] text-foreground/80">{r[1]}</span>
                        <span className="ml-auto shrink-0 font-mono2 text-[9px] text-foreground/35">{r[2]}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm leading-6 text-foreground/55">
                  Each dot is one prompt. The list of what that prompt decided appears here, for whichever model is
                  selected in the bar at the top, so you can hover the same prompt and switch models to watch the bill
                  change.
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-4 border-t border-border pt-6 md:grid-cols-2">
            <TierNote
              tier="evidence"
              text={`A bound on required work, not a tested escape: nobody ran a ${med}-clause prompt. It counts decisions the model made at the stated consistency, which is the floor on how many a user would have to overrule. All seven models are scored by the same single-annotator instrument, so the per-model medians are comparable to each other.`}
            />
            <div className="space-y-2 text-sm leading-6 text-foreground/70">
              <p>
                • <strong>The blind spot cuts the friendly way here.</strong> The detector clears its bar more easily on
                already-collapsed output, so a prompt that sits close to the default looks <em>cheap</em> to specify
                precisely because the instrument cannot see what it assumes. The bill is if anything understated where
                it is lowest.
              </p>
              <p>
                • <strong>Model spread is real.</strong>{' '}
                {Object.entries(DEBT_SUMMARY.per_model)
                  .sort((a, b) => a[1].median - b[1].median)
                  .filter((_, i, arr) => i === 0 || i === arr.length - 1)
                  .map(([m, v]) => `${MODEL_NAME[m as ModelId]?.replace('Stable Diffusion', 'SD')} at ${v.median}`)
                  .join(' up to ')}
                . A cheaper model to specify is not a less opinionated one, it is often just one the detector reads less
                confidently.
              </p>
            </div>
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}
