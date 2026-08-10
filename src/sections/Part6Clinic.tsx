import { useMemo, useState } from 'react'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { BoxPicker } from '../components/Viz'
import { rgb } from '../lib/colors'
import { C8, SITS, type Sit, type Code } from '../data/part1'
import { Q_TEXT } from '../data/uiv2'
import { useModel, MODEL_NAME } from '../data/modelContext'
import { debtRows, clauseFor, measuredFor, steerFor, STEER_CELLS, STEER_N_CELLS, LADDER_CELLS, DEEPEST_LADDER, FACTORIAL, debtSpread, median } from '../data/remedy'

/* one source for the ladder count. The two sentences below used to say "ten" and
   "14" of the same thing; both now count the same manifest. */
const N_LADDERS = Object.values(LADDER_CELLS).flat().length

/* `wedding_NG` -> "a wedding in Nigeria". These cells were both Nigerian until the
   2026-07-31 re-export took them to 8 across four countries, and the sentence that
   named them kept saying "in Nigeria" for all of them. Derive it. */
const cellPhrase = (key: string) => {
  const [sit, code] = [key.slice(0, key.lastIndexOf('_')), key.slice(key.lastIndexOf('_') + 1)]
  return `a ${sit} in ${C8[code as Code]?.name ?? code}`
}
const cellList = (keys: string[]) => {
  const p = keys.map(cellPhrase)
  return p.length > 1 ? `${p.slice(0, -1).join(', ')} and ${p[p.length - 1]}` : p[0]
}

/* The clinic gives all 378 (model, prompt) pairs a remedy view without inventing a
   single number. The measured/projected split is the point: where a ladder was
   actually run the box is solid and says MEASURED; everywhere else it is hatched,
   says PROJECTED, and prints how many observations the projection rests on. */
export default function Part6Clinic() {
  const { model } = useModel()
  const [sit, setSit] = useState<Sit>('wedding')
  const [code, setCode] = useState<Code>('NG')
  const [ticked, setTicked] = useState<Set<string>>(new Set())

  const key = `${sit}_${code}`
  const measured = measuredFor(model, key)

  /* stubborn-first: the attributes least likely to move go at the top, because the
     reader's instinct is to fix the obvious ones and the finding is about the rest */
  const rows = useMemo(() => {
    return debtRows(model, key)
      .filter((r) => r[2] >= 80)
      .map(([q, v, cons]) => {
        const s = steerFor(q)
        return { q, v, cons, clause: clauseFor(q, v), rate: s && s.n ? s.k / s.n : null, n: s?.n ?? 0, k: s?.k ?? 0 }
      })
      .sort((a, b) => (a.rate ?? -1) - (b.rate ?? -1) || b.cons - a.cons)
  }, [model, key])

  /* every prompt's bill for this model, so the chosen one can be placed among them */
  const spread = useMemo(() => debtSpread(model, 0.8).map((r) => r.n).sort((a, b) => a - b), [model])
  const med = median(spread)
  const spreadMax = Math.max(...spread, rows.length, 1)
  const harder = spread.filter((v) => v < rows.length).length

  const chosen = rows.filter((r) => ticked.has(r.q) && r.clause)
  const fixable = rows.filter((r) => r.clause)
  const prompt = `a ${sit} in ${C8[code].name}${chosen.map((r) => `, ${r.clause}`).join('')}`
  const words = prompt.split(/\s+/).length - `a ${sit} in ${C8[code].name}`.split(/\s+/).length

  const toggle = (q: string) =>
    setTicked((prev) => {
      const next = new Set(prev)
      next.has(q) ? next.delete(q) : next.add(q)
      return next
    })

  /* the projection, stated as a projection: what the pooled ladders say about the
     classes of attribute this reader ticked, never about this prompt */
  const tickedNeverMoved = chosen.filter((r) => r.k === 0 && r.n > 0)
  const untickedNeverMoved = rows.filter((r) => !ticked.has(r.q) && r.k === 0 && r.n > 0)
  /* the finding, for whichever prompt is on screen: what it would cost, what anyone
     actually tested, and how much of the bill no clause has ever been able to pay */
  const neverMoved = rows.filter((r) => r.k === 0 && r.n > 0).length

  return (
    <SceneShell
      number="16·d"
      kicker="Part VI · the escape and its price · try it yourself"
      title={<>Pick a prompt. <em className="font-display italic text-amber-200">Try to fix it.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          Everything so far has been us running the experiment. This is the same instrument pointed at
          whichever prompt you choose, all {7 * 54} model-and-prompt combinations, not just the {N_LADDERS} that
          have a measured ladder. Tick the decisions you would try to overrule and watch the prompt you would
          have to write.
        </p>
        <p className="prose-scene mt-3 max-w-2xl text-foreground/60">
          The point is not that any one prompt is bad. It is that <em>every</em> prompt you can pick here
          comes with a bill, the bill is bigger than the longest prompt anyone in this study actually
          tested, and part of it cannot be paid at any length.
        </p>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="flex flex-col gap-2.5">
            <BoxPicker label="event" value={sit} onChange={(v) => { setSit(v); setTicked(new Set()) }} size="sm"
              options={SITS.map((v) => ({ value: v, label: `a ${v}` }))} />
            <BoxPicker label="country" value={code} onChange={(v) => { setCode(v as Code); setTicked(new Set()) }} size="sm"
              options={Object.values(C8).map((c) => ({ value: c.id as Code, label: c.name, cv: c.cv }))} />
          </div>

          <p className="mt-5 font-mono2 text-[11px] text-foreground/55">
            “a {sit} in {C8[code].name}” · {MODEL_NAME[model]} decided{' '}
            <strong className="text-amber-200">{rows.length}</strong> things you did not ask for
            <span className="text-foreground/35"> · sorted stubbornest first</span>
          </p>

          {/* the number alone means nothing without the other 53 prompts beside it: is
              this a bad prompt or an ordinary one? Derived from the same table scene
              16·a plots, so the two can never disagree. */}
          <div className="mt-3 rounded-md border border-border bg-background/50 px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-3 font-mono2 text-[10px] text-foreground/45">
              <span>where this prompt sits among all {spread.length} of {MODEL_NAME[model]}'s</span>
              <span className="text-foreground/70">
                {harder === 0
                  ? 'the lightest bill of any prompt'
                  : harder === spread.length - 1
                    ? 'the heaviest bill of any prompt'
                    : `heavier than ${harder} of them`}
              </span>
            </div>
            <div className="relative mt-2 h-4">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-foreground/15" />
              {spread.map((v, i) => (
                <span
                  key={i}
                  className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/25"
                  style={{ left: `${(v / spreadMax) * 100}%` }}
                />
              ))}
              <span
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300"
                style={{ left: `${(rows.length / spreadMax) * 100}%` }}
                title={`this prompt: ${rows.length}`}
              />
              <span
                className="absolute top-0 bottom-0 w-px"
                style={{ left: `${(med / spreadMax) * 100}%`, background: rgb('--c-em') }}
                title={`median: ${med}`}
              />
            </div>
            <div className="mt-1 flex justify-between font-mono2 text-[9px] text-foreground/35">
              <span>0 decisions</span>
              {/* plain text-emerald-300, NOT /70: index.css overrides the accent colours
                  per opacity variant for the light theme and /70 is not one of them, so it
                  fell through to the dark-theme green and was unreadable on white */}
              <span className="text-emerald-300">median {med}</span>
              <span>{spreadMax}</span>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            {rows.map((r) => {
              const on = ticked.has(r.q)
              return (
                <button
                  key={r.q}
                  onClick={() => r.clause && toggle(r.q)}
                  disabled={!r.clause}
                  aria-pressed={on}
                  className={`flex w-full items-center gap-3 rounded-md border px-2.5 py-1.5 text-left transition ${
                    on ? 'border-amber-300/50 bg-amber-300/10' : 'border-border hover:border-foreground/30'
                  } ${r.clause ? 'cursor-pointer' : 'cursor-default opacity-55'}`}
                >
                  <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border font-mono2 text-[9px] ${on ? 'border-amber-300 bg-amber-300/30 text-amber-100' : 'border-foreground/30'}`}>
                    {on ? '✓' : ''}
                  </span>
                  <span className="w-36 shrink-0 truncate font-mono2 text-[10px] text-foreground/50">
                    {Q_TEXT[r.q] ?? r.q}
                  </span>
                  <span className="w-24 shrink-0 truncate font-mono2 text-[11px] text-foreground/85">{r.v}</span>
                  <span className="w-9 shrink-0 font-mono2 text-[9px] text-foreground/40">{r.cons}%</span>
                  <span className="min-w-0 flex-1 truncate font-mono2 text-[9px]">
                    {r.n === 0 ? (
                      <span className="text-foreground/30">never tested</span>
                    ) : r.k === 0 ? (
                      <span className="text-red-300/80">never moved · 0 of {r.n} ladder observations</span>
                    ) : (
                      <span className="text-foreground/45">moved {r.k} of {r.n}</span>
                    )}
                  </span>
                  {!r.clause && <span className="shrink-0 font-mono2 text-[9px] text-foreground/30">no clause exists</span>}
                </button>
              )
            })}
          </div>

          <div className="mt-6 rounded-lg border border-border bg-background/60 p-4">
            <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
              your prompt would become
            </div>
            <div className="font-display mt-1 text-lg leading-7 font-light">
              “a {sit} <span className="text-red-300">in {C8[code].name}</span>
              {chosen.map((r) => (
                <span key={r.q} className="text-amber-200">, {r.clause}</span>
              ))}
              ”
            </div>
            <div className="mt-2 font-mono2 text-[10px] text-foreground/45">
              {chosen.length} clause{chosen.length === 1 ? '' : 's'} · {words} words added ·{' '}
              to take back all {rows.length} you would need at least {fixable.length} clauses
              {fixable.length < rows.length && (
                <span className="text-foreground/35">
                  {' '}(and {rows.length - fixable.length} of them have no clause anyone has written)
                </span>
              )}
            </div>
          </div>

          {/* The finding, stated. Everything above is apparatus: a strip plot, a checklist
              and a prompt builder, each holding one third of the conclusion. Without this
              block the reader has to assemble it, and reviewers said they did not. */}
          <div className="mt-4 rounded-lg border border-amber-300/40 bg-amber-300/[0.06] p-4">
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <div className="font-mono2 text-3xl text-amber-200">{fixable.length}</div>
                <div className="font-mono2 text-[10px] leading-4 text-foreground/50">
                  clauses at minimum<br />to take this prompt back
                </div>
              </div>
              <div>
                <div className="font-mono2 text-3xl text-foreground/80">{DEEPEST_LADDER}</div>
                <div className="font-mono2 text-[10px] leading-4 text-foreground/50">
                  longest prompt<br />anyone here tested
                </div>
              </div>
              <div>
                <div className="font-mono2 text-3xl text-red-300">{neverMoved}</div>
                <div className="font-mono2 text-[10px] leading-4 text-foreground/50">
                  of them have never moved<br />under any clause, on any model
                </div>
              </div>
            </div>
            <p className="mt-3.5 border-t border-amber-300/20 pt-3 text-sm leading-6 text-foreground/75">
              {fixable.length > DEEPEST_LADDER ? (
                <>
                  So the shortest prompt that would fix “a {sit} in {C8[code].name}” is{' '}
                  <strong className="text-amber-200">
                    {(fixable.length / DEEPEST_LADDER).toFixed(1)}× longer
                  </strong>{' '}
                  than the longest one anyone in this study ran
                </>
              ) : (
                <>
                  This is one of the rare prompts whose bill is within reach of a tested prompt length
                </>
              )}
              {neverMoved > 0 && (
                <>, and {neverMoved} of its {rows.length} decisions would still be there afterwards</>
              )}
              . Prompting is not refuted here. It is <em>priced</em>.
            </p>
          </div>

          {/* MEASURED · solid amber, a real ladder exists for this cell */}
          {measured ? (
            <div className="mt-6 rounded-lg border-2 border-amber-300/50 bg-amber-300/[0.06] p-4">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="rounded bg-amber-300/20 px-2 py-0.5 font-mono2 text-[10px] tracking-wider text-amber-200 uppercase">
                  measured
                </span>
                <span className="font-mono2 text-[10px] text-foreground/50">
                  a real ladder was run on this exact prompt, {measured.clauses.length} clauses deep
                  {measured.flipped.length + measured.held.length === 0 && ' · counts only, no answer table'}
                </span>
              </div>
              <div className="mt-3 font-mono2 text-[11px] text-foreground/70">“{measured.prompt}”</div>
              {/* Six of SD 2.1's eight ladders record the assumption COUNT at each rung but
                  never the per-answer switch table. Rendering those as "0 flipped, 0 held"
                  would read as "nothing moved" when it means "nothing was recorded". */}
              {measured.flipped.length + measured.held.length === 0 ? (
                <p className="mt-4 rounded-md border border-foreground/20 px-3 py-2 text-sm leading-6 text-foreground/65">
                  This ladder was run and its assumption count was measured, but the per-attribute answer table was
                  never exported for this pair, so we cannot show you <em>which</em> answers moved. Only{' '}
                  {cellList(STEER_CELLS)} have that. What we can say is below.
                </p>
              ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="font-mono2 text-[10px] text-emerald-300">{measured.flipped.length} flipped</div>
                  <div className="mt-1.5 space-y-1">
                    {measured.flipped.slice(0, 6).map((f) => (
                      <div key={f.q} className="flex items-baseline gap-2 font-mono2 text-[10px]">
                        <span className="w-28 shrink-0 truncate text-foreground/45">{Q_TEXT[f.q] ?? f.q}</span>
                        <span className="text-foreground/45 line-through">{f.before}</span>
                        <span className="text-emerald-300">→ {f.after}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="font-mono2 text-[10px] text-red-300">{measured.held.length} did not budge</div>
                  <div className="mt-1.5 space-y-1">
                    {measured.held.slice(0, 6).map((h) => (
                      <div key={h.q} className="flex items-baseline gap-2 font-mono2 text-[10px]">
                        <span className="w-28 shrink-0 truncate text-foreground/45">{Q_TEXT[h.q] ?? h.q}</span>
                        <span className="text-red-300">still {h.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              )}
              <p className="mt-4 font-mono2 text-[10px] leading-4 text-foreground/55">
                assumption count {measured.load[0]} → {measured.load[1]} · variety{' '}
                {measured.intraset[0]?.toFixed(2)} → {measured.intraset[1]?.toFixed(2)}{' '}
                {(measured.intraset[1] ?? 0) >= (measured.intraset[0] ?? 0)
                  ? ', the set did not widen'
                  : ', the set did loosen slightly'}
              </p>
            </div>
          ) : (
            /* PROJECTED · hatched grey, deliberately a different visual register */
            <div
              className="mt-6 rounded-lg border-2 border-dashed border-foreground/25 p-4"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(127,127,127,0.06) 6px, rgba(127,127,127,0.06) 12px)',
              }}
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="rounded bg-foreground/10 px-2 py-0.5 font-mono2 text-[10px] tracking-wider text-foreground/60 uppercase">
                  projected
                </span>
                <span className="font-mono2 text-[10px] text-foreground/50">
                  no ladder was run on this prompt, this is what the two measured cells say about attributes{' '}
                  <em>like</em> these
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-foreground/70">
                {chosen.length === 0 ? (
                  <>
                    Nothing ticked yet. Of the {rows.length} decisions above,{' '}
                    <strong>{untickedNeverMoved.length}</strong> belong to attribute classes that have{' '}
                    <strong>never moved once</strong> in any ladder on any model.
                  </>
                ) : (
                  <>
                    Of your {chosen.length} ticked attribute{chosen.length === 1 ? '' : 's'},{' '}
                    <strong>{chosen.length - tickedNeverMoved.length}</strong> belong to a class that has moved
                    before and <strong>{tickedNeverMoved.length}</strong> to a class that never has. The{' '}
                    {rows.length - chosen.length} you did not tick include{' '}
                    <strong>{untickedNeverMoved.length}</strong> that have never moved in any ladder.
                  </>
                )}
              </p>
              <p className="mt-2 font-mono2 text-[10px] leading-4 text-foreground/45">
                This is a prediction from attribute class, not a measurement of this prompt.
              </p>
              <p className="mt-2 rounded border border-foreground/20 px-2.5 py-2 font-mono2 text-[10px] leading-4 text-foreground/55">
                <strong className="text-foreground/75">The leap this rests on has now been tested, partly.</strong>{' '}
                A projection like this is only sound if steerability belongs to the <em>attribute</em> rather than to
                the <em>cell</em>, and until 2026-08-02 nothing here could tell the two apart: the pooled table came
                from {STEER_N_CELLS} prompts ({cellList(STEER_CELLS)}). A separate run settles it, {' '}
                {FACTORIAL.n_conditions} single-clause conditions across {FACTORIAL.models.length} models, and it comes
                down on the attribute's side (p = {FACTORIAL.factor_r2.attribute.p < 0.001 ? '<0.001' : FACTORIAL.factor_r2.attribute.p.toFixed(3)}),
                with the prompt it was typed into at the edge of chance (p ={' '}
                {FACTORIAL.factor_r2.cell.p.toFixed(3)}) and clearly null once the one circular attribute leaves the
                test (p = {FACTORIAL.factor_r2_no_fa2.cell.p.toFixed(2)}). It tested {FACTORIAL.rows.length} cultural
                attributes plus a control, not all {rows.length} below, so the box above is a projection from a
                supported premise rather than an untested one, still not a measurement of {C8[code].name}.
              </p>
            </div>
          )}

          <div className="mt-8 border-t border-border pt-6">
            <p className="prose-scene max-w-2xl">
              Change the event, change the country, change the model at the top of the page: the numbers
              move, the shape does not. The median prompt in this study hands you{' '}
              <strong className="text-amber-200">{med}</strong> decisions you never made, and the deepest
              counter-prompt anyone ran here is <strong>{DEEPEST_LADDER}</strong> clauses. That gap is the
              finding, not that prompting fails, but that it is being asked to do a job several times
              larger than the one it has been shown to do.
            </p>
            <div className="mt-6">
            <TierNote
              tier="evidence"
              text={`Clause wording is copied from the study's own COUNTER_CLAUSE table, never generated, an attribute with no entry there was never tested for steerability, so it is listed without a checkbox rather than given improvised phrasing. That is why "to take back all ${rows.length}" is a floor twice over: one clause per decision is the minimum, and some decisions have no clause at all. ${N_LADDERS} of the ${7 * 54} combinations have a measured ladder, and only ${STEER_N_CELLS} record which answers moved, the rest render as projections and say so. The projection's premise, that steerability belongs to the attribute rather than to the prompt it was typed into, was untested until a single-clause run tested it directly, which is why the box names it as supported rather than assumed. The deepest ladder anyone ran is ${DEEPEST_LADDER} clauses.`}
            />
            </div>
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}
