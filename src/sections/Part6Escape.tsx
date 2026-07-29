import { useState } from 'react'
import { motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { ZoomImage, Picker } from '../components/Viz'
import { rgb, rgba } from '../lib/colors'
import { C8, cell, seedImg, type Sit, type Code } from '../data/part1'
import { ESCAPE_PAIRS, escapeImg, Q_TEXT } from '../data/uiv2'

const PAIRS = Object.keys(ESCAPE_PAIRS)
const EVENT_OPTS = [...new Set(PAIRS.map((k) => ESCAPE_PAIRS[k].situation))].map((v) => ({ value: v, label: `a ${v}` }))
const countriesFor = (sit: string) =>
  PAIRS.filter((k) => ESCAPE_PAIRS[k].situation === sit).map((k) => ESCAPE_PAIRS[k].code)

/* how many assumptions are live at this rung, drawn as a filled tray */
function LoadTray({ load, max = 14 }: { load: number; max?: number }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {Array.from({ length: max }).map((_, i) => (
        <motion.div
          key={i}
          animate={i < load ? { opacity: 1 } : { opacity: 0.16 }}
          transition={{ delay: i * 0.02 }}
          className={`flex h-7 items-center justify-center rounded-md border ${
            i < load ? 'border-amber-300/40 bg-amber-300/15' : 'border-border bg-background/40'
          }`}
        >
          {i < load && <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />}
        </motion.div>
      ))}
    </div>
  )
}

/* F21, in the same unit as everything else on this page: how many assumptions
   the added words recruited. The bits version was a second, unfamiliar scale
   for the same claim and it was doing more confusing than convincing. */
function LoadConservation() {
  const rows = Object.entries(ESCAPE_PAIRS).map(([k, p]) => {
    const at = (id: string) => p.levels.find((l) => l.id === id)?.load ?? null
    const country = at('L0')
    const deepest = [...p.levels].filter((l) => !l.control && l.id.startsWith('L')).pop()?.load ?? null
    const ctrls = ['ctrl_large', 'ctrl_rain', 'ctrl_1985'].map(at).filter((v): v is number => v != null)
    const plain = at('default')
    return {
      k,
      label: `a ${p.situation} in ${C8[p.code].name}`,
      plain,
      cultural: deepest ?? country,
      control: ctrls.length ? Math.round((ctrls.reduce((x, y) => x + y, 0) / ctrls.length) * 10) / 10 : null,
    }
  })
  const max = Math.max(...rows.flatMap((r) => [r.cultural ?? 0, r.control ?? 0, r.plain ?? 0]))
  const bar = (v: number | null, cls: string) => (
    <div className="relative h-5 flex-1 rounded-sm bg-foreground/5">
      {v != null && (
        <motion.div
          className={`absolute inset-y-0 left-0 flex items-center justify-end rounded-sm ${cls}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${(v / max) * 100}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="pr-1.5 font-mono2 text-[10px] text-foreground/90">{v}</span>
        </motion.div>
      )}
    </div>
  )
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3 pb-1 font-mono2 text-[9px] tracking-wider text-foreground/35 uppercase">
        <span className="w-40 shrink-0 text-right">prompt</span>
        <span className="flex-1">plain, before any qualifier</span>
        <span className="flex-1">after the country clauses</span>
        <span className="flex-1">after a neutral qualifier</span>
      </div>
      {rows.map((r) => (
        <div key={r.k} className="flex items-center gap-3">
          <span className="w-40 shrink-0 text-right font-mono2 text-[11px] text-foreground/60">{r.label}</span>
          {bar(r.plain, 'bg-foreground/25')}
          {bar(r.cultural, 'bg-red-400/70')}
          {bar(r.control, 'bg-foreground/35')}
        </div>
      ))}
      <p className="pt-2 font-mono2 text-[10px] leading-4 text-foreground/45">
        Bars are counts of assumptions the model is making at that prompt. Read across a row: the middle bar is longer
        than the left one in every case, and the right bar is longer than the left one just as often. Adding words
        adds assumptions, and it does not matter whether the words name a country.
      </p>
    </div>
  )
}

export default function Part6Escape() {
  const [event, setEvent] = useState('wedding')
  const [country, setCountry] = useState<Code>('NG')
  const [level, setLevel] = useState(1)
  const available = countriesFor(event)
  const activeCountry = available.includes(country) ? country : available[0]
  const pairKey = `${event}_${activeCountry}`
  const pair = ESCAPE_PAIRS[pairKey]
  const rungs = pair.levels.filter((l) => !l.control)
  const cur = rungs[Math.min(level, rungs.length - 1)]
  const sit = pair.situation as Sit
  const code = pair.code as Code
  const switches = pair.switches[cur.id] ?? []
  const flipped = switches.filter((s) => s.flipped)
  const held = switches.filter((s) => !s.flipped).slice(0, 6)
  const seeds = cell(sit, code).typical_order
  const plain = rungs[0]

  const rungImg = (i: number, s: number) =>
    i === 0 ? seedImg(sit, 'default', seeds[s]) : i === 1 ? seedImg(sit, code, seeds[s]) : escapeImg(pairKey, cur.id, s)

  return (
    <SceneShell
      number="17"
      kicker="Part VI · the escape and its price · findings 20–21"
      title={<>Counter-specification: the obvious remedy, <em className="font-display italic text-amber-200">measured.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          If “a wedding in Nigeria” comes out outdoors on every seed, the obvious fix is to say so: write “a wedding in
          Nigeria, indoors.” We built that ladder for eight event-and-country pairs, one clause per named assumption,
          up to three clauses deep, and measured what happened at every rung. The clauses do work. The escape does not
          happen.
        </p>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="flex flex-wrap items-end gap-4">
            <Picker
              label="event"
              value={event}
              onChange={(v) => { setEvent(v); setLevel(1) }}
              options={EVENT_OPTS}
            />
            <Picker
              label="country"
              value={activeCountry}
              onChange={(v) => { setCountry(v as Code); setLevel(1) }}
              options={available.map((c) => ({ value: c, label: C8[c].name }))}
              accent={C8[activeCountry].cv}
            />
          </div>

          {/* the rungs stay as buttons: they are a ladder, and a dropdown hid that */}
          <div className="mt-5">
            <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
              how many clauses have been added
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {rungs.map((l, i) => (
                <button
                  key={l.id}
                  onClick={() => setLevel(i)}
                  className={`chip !px-3 !py-1.5 ${level === i ? 'chip-active' : ''}`}
                >
                  {l.id === 'default' ? 'plain prompt' : l.id === 'L0' ? `+ in ${C8[activeCountry].name}` : l.id}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-border bg-background/60 p-4">
            <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">the prompt at this rung</div>
            <div className="font-display mt-1 text-xl leading-8 font-light">
              “a {sit}
              {level >= 1 && <span className="text-red-300"> in {C8[code].name}</span>}
              {cur.clauses.map((c) => (
                <span key={c} className="text-amber-200">, {c}</span>
              ))}
              ”
            </div>
          </div>

          <div className="mt-5">
            <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
              what that prompt draws · 3 of 50 seeds
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[0, 1, 2].map((s) => (
                <ZoomImage
                  key={s}
                  src={rungImg(level, s)}
                  alt={`${pairKey} rung ${cur.id} seed ${s}`}
                  caption={`“${cur.prompt}” · seed ${s}`}
                  imgClassName="h-32 w-32 cursor-zoom-in rounded-lg border border-border object-cover"
                />
              ))}
            </div>
          </div>

          {/* the feature switch: what the extra clause actually changed, and what it did not */}
          {level >= 2 && (
            <div className="mt-8 border-t border-border pt-5">
              <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
                what changed, attribute by attribute, against “a {sit} in {C8[code].name}”
              </div>
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div>
                  <div className="font-mono2 text-[10px] text-emerald-300">{flipped.length} answers flipped</div>
                  <div className="mt-2 space-y-1.5">
                    {flipped.slice(0, 8).map((s) => (
                      <div key={s.q} className="flex items-center gap-2 rounded-md border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1.5">
                        <span className="w-28 shrink-0 truncate font-mono2 text-[10px] text-foreground/45" title={Q_TEXT[s.q] ?? s.q}>
                          {Q_TEXT[s.q] ?? s.q}
                        </span>
                        <span className="font-mono2 text-[11px] text-foreground/50 line-through">{s.before}</span>
                        <span className="font-mono2 text-[11px] text-foreground/30">→</span>
                        <span className="font-mono2 text-[11px] text-emerald-300">{s.after}</span>
                        <span className="ml-auto shrink-0 font-mono2 text-[9px] text-foreground/35">
                          {Math.round(s.before_share * 100)}% → {Math.round(s.after_share * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 font-mono2 text-[10px] leading-4 text-foreground/40">
                    Only the first clause was asked for. Everything else here moved on its own, because the model's
                    idea of an indoor {C8[code].name} {sit} comes with its own furniture.
                  </p>
                </div>
                <div>
                  <div className="font-mono2 text-[10px] text-red-300">what did not budge</div>
                  <div className="mt-2 space-y-1.5">
                    {held.map((s) => (
                      <div key={s.q} className="flex items-center gap-2 rounded-md border border-red-400/20 bg-red-400/5 px-2.5 py-1.5">
                        <span className="w-28 shrink-0 truncate font-mono2 text-[10px] text-foreground/45" title={Q_TEXT[s.q] ?? s.q}>
                          {Q_TEXT[s.q] ?? s.q}
                        </span>
                        <span className="font-mono2 text-[11px] text-red-300">{s.after}</span>
                        <span className="ml-auto shrink-0 font-mono2 text-[9px] text-foreground/35">
                          still {Math.round(s.after_share * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 font-mono2 text-[10px] leading-4 text-foreground/40">
                    People count is the most stubborn of all: it stayed at “6+” in all eight pairs, including the ones
                    that asked in so many words for a small group.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 grid gap-8 border-t border-border pt-6 md:grid-cols-3">
            <div>
              <div className="font-mono2 text-xs tracking-wider text-foreground/40 uppercase">assumptions live at each rung</div>
              <div className="mt-4 flex items-end gap-2">
                {rungs.map((l, i) => (
                  <button key={l.id} onClick={() => setLevel(i)} className="flex flex-1 flex-col items-center gap-1.5">
                    <motion.div
                      className="w-full rounded-t"
                      initial={{ height: 0 }}
                      animate={{ height: ((l.load ?? 0) / 14) * 110 }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      style={{ background: i === level ? rgb('--c-amber') : (l.load ?? 0) > (plain.load ?? 0) ? rgba('--c-ng', 0.6) : rgb('--c-gray') }}
                    />
                    <span className={`font-mono2 text-[10px] ${i === level ? 'text-amber-200' : 'text-foreground/40'}`}>{l.load}</span>
                    <span className="font-mono2 text-[9px] text-foreground/30">{l.id}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 font-mono2 text-[11px] leading-5 text-foreground/45">
                {rungs.map((l) => l.load).join(' → ')}. Adding a clause to remove an assumption{' '}
                {(rungs.at(-1)?.load ?? 0) >= (rungs[1]?.load ?? 0) ? 'does not reduce the count' : 'does reduce the count here: the one pair that escapes'}.
              </p>
            </div>
            <div>
              <div className="font-mono2 text-xs tracking-wider text-foreground/40 uppercase">the live set at this rung</div>
              <div className="mt-4">
                <LoadTray load={cur.load ?? 0} />
              </div>
              <p className="mt-3 font-mono2 text-[11px] leading-5 text-foreground/45">
                Counter-specifying one assumption leaves its unnamed neighbours in place, and usually recruits a
                couple more.
              </p>
            </div>
            <div>
              <div className="font-mono2 text-xs tracking-wider text-foreground/40 uppercase">variety at this rung</div>
              <div className="mt-4 font-mono2 text-4xl text-foreground">{cur.intraset?.toFixed(2) ?? '·'}</div>
              <p className="mt-2 font-mono2 text-[11px] leading-5 text-foreground/45">
                against <strong className="text-foreground/70">{plain.intraset?.toFixed(2)}</strong> for the plain
                prompt. Attribute-level steering works. Distribution-level escape does not happen: the set stays as
                narrow as it was.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 border-t border-border pt-6 md:grid-cols-2">
            <TierNote
              tier="evidence"
              text="Eight pairs (wedding and celebration × Nigeria, India, Germany, Egypt) × 50 seeds per rung, the full questionnaire run at every rung. Ladders stop early where a pair had too few named assumptions to counter-specify further."
            />
            <div className="space-y-2 text-sm leading-6 text-foreground/70">
              <p>
                • <strong>Seven of the eight pairs</strong> never escape within three clauses: the assumption count
                rises or holds flat. Specification relocates assumptions, it does not remove them.
              </p>
              <p>
                • <strong>The exception</strong> is a celebration in Egypt, where the count falls 8 → 6 → 4 → 3. Its
                rehearsed scene was the shallowest to begin with, sitting closest to the plain prompt, so resistance
                tracks how deeply the scene is dug in rather than which country was named.
              </p>
            </div>
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={0.1}>
        <Panel className="mt-6">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            finding 21 · is naming a country what makes it expensive?
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-foreground/70">
            Everything above shows that adding words adds assumptions. The obvious next question is whether{' '}
            <em>country</em> words are special in that respect, the way they turned out to be special for variety.
            So we compared them against the same neutral qualifiers from scene 12: “a large wedding”, “a wedding in the
            rain”, “a wedding in 1985”. Same lengths, no culture named.
          </p>
          <div className="mt-6">
            <LoadConservation />
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-foreground/70">
            The answer is no, and that is worth stating plainly because it cuts against the easy story. The two
            effects come apart. <strong>The variety collapse is culture-specific</strong>, which is scene 12.
            <strong> The rising assumption count is not</strong>: every added word recruits the prior, whatever the
            word is. What makes country words dangerous is not that they cost more. It is what they buy.
          </p>
          <div className="mt-6 border-t border-border pt-5">
            <TierNote
              tier="evidence"
              text="Counts come from the same frozen questionnaire run at every rung, 50 seeds each. We also measured the same thing on a continuous scale, in bits of narrowing rather than whole assumptions, and it gives the same answer: the country ladder adds 2.2 bits on the hero pair, the neutral qualifiers add 0.8, and across the eight pairs neither is reliably larger than the other."
            />
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mx-auto mt-20 max-w-3xl text-center">
          <p className="font-display text-3xl leading-snug font-light text-foreground/90 md:text-4xl">
            One cannot prompt a way out of a default one cannot see,{' '}
            <span className="text-amber-200 italic">and even once it is visible, the exit costs more words than anyone types.</span>
          </p>
        </div>
      </Reveal>
    </SceneShell>
  )
}
