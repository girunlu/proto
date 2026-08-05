import { motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { rgb } from '../lib/colors'
import { Q_TEXT, Q_FAMILY } from '../data/uiv2'
import { MODEL_NAME, type ModelId } from '../data/modelContext'
import { STEER_ROWS, STEER_PER_MODEL, STEER_CELLS, STEER_N_CELLS, LADDER_CELLS, steerTotal, neverMoved, type Bucket } from '../data/remedy'

/* derived, not typed in: Job 5 added sdxl + hunyuandit on 2026-08-03 and the two
   counts below moved with it. */
const N_STEER_MODELS = Object.keys(STEER_PER_MODEL).length
const N_LADDERS = Object.values(LADDER_CELLS).flat().length

/* Q_FAMILY has existed in uiv2.ts since the Tier-B pass and nothing rendered it.
   The families are exactly the grouping this scene's finding is about — place and
   venue yield, era and presence do not — so it finally has a job. */
const FAMILY_CV: Record<string, string> = {
  'where it happens': '--c-em',
  'what people wear': '--c-amber',
  'who is there': '--c-sky',
  'when it looks like': '--c-red',
  'what objects appear': '--c-gray',
  'how well-off it looks': '--c-sky',
  'where in the world it looks like': '--c-red',
  'what kind of event': '--c-gray',
  'the scene overall': '--c-gray',
}

export default function Part6Steer() {
  /* The two-view toggle was removed 2026-08-03: 12 of the 19 rows were byte-identical
     between them and only 3 differed by more than 2 points, so it cost the reader a
     decision and a paragraph to change almost nothing. What survives is the side-effect
     view — the scene's actual claim. That clauses DO move their own target is stated in
     prose below rather than given its own control. */
  const bucket: Bucket = 'untargeted'
  /* Sorted by flip rate, biggest first. This was briefly a fixed canonical order, back
     when two buttons swapped the underlying number and the rows visibly reshuffled under
     the reader. With a single view there is nothing to jump against, and ranking is the
     more useful axis: the chart's whole point is which things yield and which never do. */
  const rows = [...STEER_ROWS]
    .filter((r) => r[bucket].n > 0)
    .sort((a, b) => b[bucket].k / b[bucket].n - a[bucket].k / a[bucket].n)
  const total = steerTotal(bucket)
  const never = neverMoved(bucket)
  const u12 = STEER_ROWS.find((r) => r.q === 'U12')?.[bucket]
  const held = total.n - total.k
  const oneIn = Math.round(total.n / Math.max(1, total.k))

  return (
    <SceneShell
      number="16·b"
      kicker="Part VI · the escape and its price · what a clause can move"
      title={<>Some things yield to a clause. <em className="font-display italic text-amber-200">Some things never move at all.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          The ladder above walks one prompt at a time. Pool every counter-specified rung instead —{' '}
          {total.n} side-effect observations across {N_STEER_MODELS} models — and ask a different question, one per
          attribute: when a clause was added, how often did this attribute's majority answer actually change?
        </p>
        <p className="prose-scene mt-4 max-w-2xl rounded-md border border-amber-300/30 bg-amber-300/5 px-4 py-3 text-[13px] leading-6">
          <strong className="text-amber-200">Read the breadth before the law.</strong> This is{' '}
          <strong>{total.n}</strong> observations over <strong>{STEER_N_CELLS}</strong> prompts spanning
          four countries — Germany, Egypt, India and Nigeria — on {N_STEER_MODELS} models. Broad enough to be worth stating as
          a pattern; still {N_LADDERS} ladders rather than a designed sweep, so read it as the strongest description available
          and not as a law.
        </p>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            flip rate per attribute · 95% Wilson intervals
          </div>
          {/* a reader arriving here knows none of this. Two sentences: what a row is, then
              what is and is not counted. Everything else lives in the note below. */}
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/65">
            One row per thing the model decides. The bar is how often that decision <em>changed</em> when a clause was
            added to the prompt — <strong>100% means a clause always moved it, 0% means nothing ever did.</strong>
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/60">
            Every clause was written to change one specific thing, and that thing is{' '}
            <strong className="text-amber-200">left out of these bars</strong>. What you are seeing is the side
            effects: the decisions you never asked about, moving anyway. Clauses do usually move their own target —
            that is them working — but this chart is about everything else they disturb.
          </p>

          {/* the switcher genuinely does nothing here and a reader will try it: these rows
              are pooled over every ladder model, because per model per attribute the n
              collapses to a handful and no row would be readable. The per-model split
              that DOES exist is the block below. */}
          <p className="mt-2 max-w-3xl font-mono2 text-[10px] leading-4 text-foreground/35">
            Pooled over all {N_STEER_MODELS} models with a ladder — this chart does not follow the model switcher.
            Per attribute per model the counts fall to single figures, which no interval could carry. The per-model
            comparison is the panel underneath, where the n is large enough to mean something.
          </p>

          <div className="mt-6 space-y-1">
            {rows.map((r, idx) => {
              const b = r[bucket]
              const p = b.k / b.n
              const fam = Q_FAMILY[r.q] ?? 'the scene overall'
              /* the finding as a shape: everything below this line is a hard zero, and
                 ranking is what makes the break visible without reading a number */
              const firstZero = p === 0 && idx > 0 && rows[idx - 1][bucket].k > 0
              return (
                <div key={r.q}>
                {firstZero && (
                  <div className="flex items-center gap-3 pt-3 pb-1.5">
                    <span className="w-40 shrink-0" />
                    <span className="min-w-0 flex-1 border-t border-red-300/25" />
                    <span className="shrink-0 font-mono2 text-[9px] tracking-wider text-red-300/80 uppercase">
                      below here, no clause ever moved it
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-right font-mono2 text-[10px] text-foreground/55" title={`${Q_TEXT[r.q] ?? r.q} · ${fam}`}>
                    {Q_TEXT[r.q] ?? r.q}
                  </span>
                  <div className="relative h-4 min-w-0 flex-1 rounded-sm bg-foreground/5">
                    {/* the Wilson interval, drawn behind the point estimate — with n
                        this small the interval is the honest object, not the bar */}
                    <div
                      className="absolute inset-y-1 rounded-sm bg-foreground/10"
                      style={{ left: `${b.lo * 100}%`, width: `${Math.max(0.5, (b.hi - b.lo) * 100)}%` }}
                    />
                    <motion.div
                      className="absolute inset-y-0.5 left-0 rounded-sm"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${p * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5 }}
                      style={{ background: rgb(FAMILY_CV[fam] ?? '--c-gray'), opacity: p === 0 ? 0 : 0.75 }}
                    />
                    {p === 0 && (
                      <span className="absolute inset-y-0 left-1 flex items-center font-mono2 text-[9px] text-red-300/80">
                        never moved
                      </span>
                    )}
                  </div>
                  {/* the rate in words the reader already has: a percentage, then the
                      raw counts it came from. k/n alone made every row a division problem. */}
                  <span
                    className={`w-10 shrink-0 text-right font-mono2 text-[12px] ${p === 0 ? 'text-red-300/80' : 'text-foreground/85'}`}
                  >
                    {Math.round(p * 100)}%
                  </span>
                  <span className="w-24 shrink-0 text-right font-mono2 text-[9px] text-foreground/40">
                    moved {b.k} of {b.n}
                  </span>
                  <span className="hidden w-20 shrink-0 text-right font-mono2 text-[9px] text-foreground/30 sm:block">
                    [{Math.round(b.lo * 100)}–{Math.round(b.hi * 100)}%]
                  </span>
                </div>
                </div>
              )
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 font-mono2 text-[9px] text-foreground/40">
            {[...new Set(rows.map((r) => Q_FAMILY[r.q] ?? 'the scene overall'))].map((f) => (
              <span key={f}>
                <span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: rgb(FAMILY_CV[f] ?? '--c-gray'), opacity: 0.75 }} />
                {f}
              </span>
            ))}
          </div>

          <div className="mt-8 grid gap-6 border-t border-border pt-6 md:grid-cols-2">
            <div className="space-y-3 text-sm leading-6 text-foreground/70">
              <p>
                <strong>The law, as far as it goes:</strong> where the scene happens yields to a clause — building type,
                venue, indoors or outdoors. What kind of world it is does not. Era, whether people are present, what they
                are doing, and which continent it looks like sit exactly where they were.
              </p>
              <p>
                Pooled, <strong>{total.k} of {total.n}</strong> observations flipped. About{' '}
                <strong>one in {oneIn}</strong> — the other {held} stayed put.
              </p>
              {u12 && (
                <p className="rounded-md border border-red-400/25 bg-red-400/5 px-3 py-2">
                  The one to sit with: <strong>which continent the image looks like</strong> moved{' '}
                  <strong>{u12.k} times out of {u12.n}</strong>. With n that small the honest ceiling is{' '}
                  {Math.round(u12.hi * 100)}%, not zero. And not one of those was a clause working: no ladder in the
                  study ever aimed at it, so it is the attribute this whole page is about and nobody has ever written
                  the sentence that asks for it — the flips it does have are collateral from asking for something else.
                </p>
              )}
            </div>
            <div>
              <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
                by model · same protocol, different flip rates
              </div>
              <div className="mt-3 space-y-2">
                {Object.entries(STEER_PER_MODEL).map(([m, v]) => {
                  const b = v[bucket]
                  const p = b.n ? b.k / b.n : 0
                  return (
                    <div key={m} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 truncate text-right font-mono2 text-[10px] text-foreground/50">
                        {MODEL_NAME[m as ModelId]?.replace('Stable Diffusion', 'SD') ?? m}
                      </span>
                      <div className="relative h-4 min-w-0 flex-1 rounded-sm bg-foreground/5">
                        <motion.div
                          className="absolute inset-y-0.5 left-0 rounded-sm bg-amber-300/60"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${p * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-right font-mono2 text-[10px] text-foreground/50">
                        {b.k}/{b.n}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 font-mono2 text-[10px] leading-4 text-foreground/45">
                Stable Diffusion 2.1 looks the most steerable of the {N_STEER_MODELS}, and part of that is real — but part of it is
                that its ladder was written against its own assumption list and reached three clauses on more pairs.
                Switch to “attributes nobody asked about” to strip out the attributes each clause was aimed at.
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <TierNote
              tier="evidence"
              text={`${total.n} untargeted attribute observations from every counter-specified rung that records them — ${STEER_N_CELLS} cells (${STEER_CELLS.join(', ')}) across ${N_STEER_MODELS} models, NOT the full ${N_LADDERS} ladders: six of SD 2.1's eight ship an empty switch table. Proportions carry 95% Wilson intervals rather than being printed as "0%", because ${never.length} attributes have zero flips and a zero with n=${Math.min(...never.map((r) => r[bucket].n))}–${Math.max(...never.map((r) => r[bucket].n))} is not the same claim as a zero with n=1000. Two confounds remain: clause depth differs per observation (rungs L1 through L7 are pooled), and each ladder targets a different attribute set, so per-attribute n is unbalanced. A third — that every observation came from two Nigerian cells, which made attribute and cell impossible to separate — was removed on 2026-07-31 when these tables were re-exported from the gemma4 annotations that already covered all eight pairs. A single-clause factorial holding depth at exactly 1 would settle the rest — it was run on 2026-08-02 and is the next scene.`}
            />
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}
