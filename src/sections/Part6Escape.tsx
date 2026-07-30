import { useState } from 'react'
import { motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { ZoomImage, BoxPicker, useMagnet } from '../components/Viz'
import { rgb, rgba } from '../lib/colors'
import { C8, cell, seedImg, type Sit, type Code } from '../data/part1'
import { ESCAPE_PAIRS, Q_TEXT } from '../data/uiv2'
import { escapeUmap, escapePairsFor, xmEscapeImg, type XmEscapePair } from '../data/crossmodel'
import { useModel, MODEL_NAME, type ModelId } from '../data/modelContext'
import { isSd21, modelImg, modelSeeds } from '../data/modelData'

const PAIRS = Object.keys(ESCAPE_PAIRS)
const EVENT_OPTS = [...new Set(PAIRS.map((k) => ESCAPE_PAIRS[k].situation))].map((v) => ({ value: v, label: `a ${v}` }))

/* the two ladder shapes the scene can be handed: SD 2.1's (with the neutral-qualifier
   controls) and a cross-model one (L0 upward, no controls) */
type EscapePairLike = Omit<XmEscapePair, 'levels'> & {
  levels: (XmEscapePair['levels'][number] & { control?: boolean })[]
  final_load_delta?: number
}

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
/* F20 as a picture, built in the same idiom as the Part I UMAPs: one dot per seed,
   a ringed centroid per rung with its own label, the pointer magnet-snapping to the
   nearest dot. Deliberately small — it is a supporting figure inside a scene that
   already has a ladder, a load tray and an attribute table. */
function LadderMap({ model, pair, rung, onPick }: {
  model: ModelId
  pair: string
  /* the rung *id*, not an index: the projection always contains the plain prompt,
     while a cross-model ladder starts at L0, so the two lists don't line up */
  rung: string
  onPick: (id: string) => void
}) {
  const data = escapeUmap(model, pair)
  const [hover, setHover] = useState<{ l: string; s: number } | null>(null)

  const W = 420
  const H = 260
  const pad = 26
  const X = (x: number) => pad + x * (W - 2 * pad)
  const Y = (y: number) => H - pad - y * (H - 2 * pad)
  const CV: Record<string, string> = {
    default: '--c-gray', L0: '--c-red', L1: '--c-amber', L2: '--c-sky', L3: '--c-em',
  }
  const LABEL: Record<string, string> = {
    default: 'plain', L0: '+country', L1: 'L1', L2: 'L2', L3: 'L3',
  }

  const magnet = useMagnet(
    (data?.points ?? []).map((p) => ({ x: X(p.xy[0]), y: Y(p.xy[1]), item: p })),
    (p) => setHover(p ? { l: p.l, s: p.s } : null)
  )
  if (!data) return null
  const active = rung

  /* the centroid of each rung, in plot space — the thing the reader is actually
     asked to compare, so it gets the ring-and-label treatment */
  const cents = data.levels.map((l) => {
    const ps = data.points.filter((p) => p.l === l)
    return {
      l,
      x: ps.reduce((a, p) => a + p.xy[0], 0) / ps.length,
      y: ps.reduce((a, p) => a + p.xy[1], 0) / ps.length,
    }
  })

  return (
    <div className="mx-auto max-w-md">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair" {...magnet}>
        {data.points.map((p, i) => {
          const on = active === p.l
          const isHover = hover?.l === p.l && hover?.s === p.s
          return (
            <circle
              key={i}
              cx={X(p.xy[0])}
              cy={Y(p.xy[1])}
              r={isHover ? 6 : 3}
              fill={rgb(CV[p.l] ?? '--c-gray')}
              fillOpacity={isHover ? 1 : on ? 0.75 : 0.18}
              stroke={isHover ? 'white' : 'none'}
              pointerEvents="none"
            />
          )
        })}
        {cents.map((c) => (
          <g key={c.l} pointerEvents="none" opacity={active === c.l ? 1 : 0.35}>
            <circle cx={X(c.x)} cy={Y(c.y)} r={8} fill="none" stroke={rgb(CV[c.l] ?? '--c-gray')} strokeWidth={2} />
            <text
              x={X(c.x)}
              y={Y(c.y) - 12}
              textAnchor="middle"
              fontSize="9"
              fill={rgb(CV[c.l] ?? '--c-gray')}
              fontFamily="JetBrains Mono"
            >
              {LABEL[c.l] ?? c.l}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {data.levels.map((l) => (
          <button
            key={l}
            onClick={() => onPick(l)}
            className={`flex items-center gap-1.5 font-mono2 text-[10px] transition ${active === l ? 'text-foreground/85' : 'text-foreground/40 hover:text-foreground/70'}`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: rgb(CV[l] ?? '--c-gray'), opacity: active === l ? 1 : 0.4 }}
            />
            {l === 'default' ? 'plain prompt' : l === 'L0' ? 'country named' : l}
          </button>
        ))}
      </div>
      <p className="mt-1 font-mono2 text-[9px] leading-4 text-foreground/40">
        {hover
          ? `${hover.l === 'default' ? 'plain prompt' : hover.l === 'L0' ? 'country named' : hover.l} · seed ${hover.s}`
          : 'one dot per seed · rings are each rung\'s centre · click a rung to bring it forward'}
      </p>
    </div>
  )
}

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
  const { model } = useModel()
  const [event, setEvent] = useState('wedding')
  const [country, setCountry] = useState<Code>('NG')
  const [rungId, setRungId] = useState('L0')
  /* Four models were run up the ladder: SD 2.1 on all eight pairs, and Kolors,
     SD 3.5 Large and Qwen-Image on the two Nigeria pairs. Each of those three has
     its OWN clauses, chosen from its own headline assumptions — that is what makes
     switching model worth doing here, the prompts differ, not just the pictures.
     The other three models have no ladder at all, so the scene holds on SD 2.1 and
     says which four it has. */
  const xm = isSd21(model) ? null : escapePairsFor(model)
  const usingSd21 = !isSd21(model) && xm === null
  const ladderModel: ModelId = usingSd21 ? 'sd21' : model
  const pairs: Record<string, EscapePairLike> = xm ?? (ESCAPE_PAIRS as unknown as Record<string, EscapePairLike>)
  const pairKeys = Object.keys(pairs)
  const eventOpts = xm
    ? [...new Set(pairKeys.map((k) => pairs[k].situation))].map((v) => ({ value: v, label: `a ${v}` }))
    : EVENT_OPTS
  const activeEvent = pairKeys.some((k) => pairs[k].situation === event) ? event : pairs[pairKeys[0]].situation
  const available = pairKeys.filter((k) => pairs[k].situation === activeEvent).map((k) => pairs[k].code as Code)
  const activeCountry = available.includes(country) ? country : available[0]
  const pairKey = `${activeEvent}_${activeCountry}`
  const pair = pairs[pairKey]
  const rungs = pair.levels.filter((l) => !l.control)
  const cur = rungs.find((l) => l.id === rungId) ?? rungs[0]
  const sit = pair.situation as Sit
  const code = pair.code as Code
  const switches = pair.switches[cur.id] ?? []
  const flipped = switches.filter((s) => s.flipped)
  const held = switches.filter((s) => !s.flipped).slice(0, 6)
  const seeds = isSd21(ladderModel) ? cell(sit, code).typical_order : modelSeeds(ladderModel, sit, code, 20)
  const plain = rungs[0]
  /* the rung every count is judged against: the country-named prompt. SD 2.1's ladder
     starts one rung earlier (the plain prompt), so this cannot be rungs[1] for both. */
  const baseline = rungs.find((l) => l.id === 'L0') ?? rungs[0]
  const deltaFromBaseline = (rungs.at(-1)?.load ?? 0) - (baseline.load ?? 0)
  /* the per-pair summary under the chart, derived so it can never claim an escape
     this model's own ladder did not produce */
  const pairSummary = pairKeys.map((k) => {
    const p = pairs[k]
    const rs = p.levels.filter((l) => !l.control)
    const b = rs.find((l) => l.id === 'L0') ?? rs[0]
    return {
      k,
      label: `${p.situation} in ${C8[p.code as Code].name}`,
      loads: rs.map((l) => l.load),
      intra: rs.map((l) => l.intraset?.toFixed(2) ?? '·'),
      delta: (rs.at(-1)?.load ?? 0) - (b.load ?? 0),
    }
  })

  /* rung 0 and 1 are that model's own plain and country cells, already shipped for
     every model; only L1-L3 need the ladder's own thumbnails */
  const rungImg = (id: string, s: number) =>
    id === 'default'
      ? isSd21(ladderModel) ? seedImg(sit, 'default', seeds[s]) : modelImg(ladderModel, sit, 'default', seeds[s])
      : id === 'L0'
        ? isSd21(ladderModel) ? seedImg(sit, code, seeds[s]) : modelImg(ladderModel, sit, code, seeds[s])
        : xmEscapeImg(ladderModel, pairKey, id, s)

  return (
    <SceneShell
      number="16"
      kicker="Part VI · the escape and its price · findings 20–21"
      title={<>Counter-specification: the obvious remedy, <em className="font-display italic text-amber-200">measured.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          If “a wedding in Nigeria” comes out outdoors on every seed, the obvious fix is to say so: write “a wedding in
          Nigeria, indoors.” We built that ladder one clause per named assumption, up to three clauses deep, and
          measured what happened at every rung — eight event-and-country pairs on Stable Diffusion 2.1, and the two
          Nigeria pairs on Kolors, SD 3.5 Large and Qwen-Image, each from its own list of assumptions. The clauses do
          work. The escape does not happen.
        </p>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            the ladder · {MODEL_NAME[ladderModel]}
          </div>
          {!isSd21(model) && (
            <p className={`mt-3 mb-4 rounded-md border px-3 py-2 font-mono2 text-[10px] leading-4 ${xm ? 'border-border bg-foreground/[0.04] text-foreground/70' : 'border-amber-300/30 bg-amber-300/5 text-amber-700 dark:text-amber-200/90'}`}>
              {xm
                ? `${MODEL_NAME[model]} was run up its own ladder for the two Nigeria pairs, and the clauses below are its own — chosen from its own headline assumptions, so they are not the same words SD 2.1 was given.`
                : `${MODEL_NAME[model]} has no counter-specification ladder: only Stable Diffusion 2.1 (all eight pairs) and Kolors, SD 3.5 Large and Qwen-Image (the two Nigeria pairs) were run. The plain and country prompts exist for every model, but a ladder needs the counter-specified rungs, so this scene stays on Stable Diffusion 2.1.`}
            </p>
          )}
          {/* boxes, like every other selector on the page since the Tier-B pass */}
          <div className="flex flex-col gap-2.5">
            <BoxPicker
              label="event"
              value={activeEvent}
              onChange={(v) => { setEvent(v); setRungId('L0') }}
              options={eventOpts}
              size="sm"
            />
            <BoxPicker
              label="country"
              value={activeCountry}
              onChange={(v) => { setCountry(v as Code); setRungId('L0') }}
              options={available.map((c) => ({ value: c, label: C8[c].name, cv: C8[c].cv }))}
              size="sm"
            />
          </div>

          {/* the rungs stay as buttons: they are a ladder, and a dropdown hid that */}
          <div className="mt-5">
            <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
              how many clauses have been added
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {rungs.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setRungId(l.id)}
                  className={`chip !px-3 !py-1.5 ${cur.id === l.id ? 'chip-active' : ''}`}
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
              {cur.id !== 'default' && <span className="text-red-300"> in {C8[code].name}</span>}
              {cur.clauses.map((c) => (
                <span key={c} className="text-amber-200">, {c}</span>
              ))}
              ”
            </div>
          </div>

          <div className="mt-5">
            <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
              what that prompt draws · 3 of 50 seeds · {MODEL_NAME[ladderModel]}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[0, 1, 2].map((s) => (
                <ZoomImage
                  key={s}
                  src={rungImg(cur.id, s)}
                  alt={`${pairKey} rung ${cur.id} seed ${s}`}
                  caption={`“${cur.prompt}” · seed ${s}`}
                  imgClassName="h-32 w-32 cursor-zoom-in rounded-lg border border-border object-cover"
                />
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-5">
            <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
              the whole ladder in one projection · every seed of every rung
            </div>
            <p className="mt-2 max-w-3xl text-[13px] leading-5 text-foreground/55">
              A UMAP of the same embeddings the numbers above are computed from, fitted over all five rungs at once —
              the same projection Part I uses, read the same way. The plain prompt is one cloud, the country prompt is
              another, and the counter-specified rungs stay alongside the country prompt rather than travelling back
              toward the plain one. Escaping an attribute does not move the set.
            </p>
            <div className="mt-4">
              <LadderMap model={ladderModel} pair={pairKey} rung={cur.id} onPick={setRungId} />
            </div>
          </div>

          {/* the feature switch: what the extra clause actually changed, and what it did not */}
          {cur.id.startsWith('L') && cur.id !== 'L0' && (
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
                    {xm
                      ? `The clauses at this rung asked for ${(pair.targeted?.[cur.id] ?? []).map((q: string) => Q_TEXT[q] ?? q).join(', ') || 'nothing yet'} — and those attributes are excluded from this list. Everything above moved without being asked.`
                      : `Only the first clause was asked for. Everything else here moved on its own, because the model's idea of an indoor ${C8[code].name} ${sit} comes with its own furniture.`}
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
                    {isSd21(ladderModel)
                      ? 'People count is the most stubborn of all: it stayed at “6+” in all eight pairs, including the ones that asked in so many words for a small group.'
                      : `${held.length} of this rung's attributes hold their answer at the same majority they had before any clause was added.`}
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
                  <button key={l.id} onClick={() => setRungId(l.id)} className="flex flex-1 flex-col items-center gap-1.5">
                    <motion.div
                      className="w-full rounded-t"
                      initial={{ height: 0 }}
                      animate={{ height: ((l.load ?? 0) / 14) * 110 }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      style={{ background: l.id === cur.id ? rgb('--c-amber') : (l.load ?? 0) > (baseline.load ?? 0) ? rgba('--c-ng', 0.6) : rgb('--c-gray') }}
                    />
                    <span className={`font-mono2 text-[10px] ${l.id === cur.id ? 'text-amber-200' : 'text-foreground/40'}`}>{l.load}</span>
                    <span className="font-mono2 text-[9px] text-foreground/30">{l.id}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 font-mono2 text-[11px] leading-5 text-foreground/45">
                {rungs.map((l) => l.load).join(' → ')}. Counting from “{plain.prompt}”, three clauses later the count{' '}
                {deltaFromBaseline === 0
                  ? 'is exactly where it started'
                  : deltaFromBaseline > 0
                    ? `is ${deltaFromBaseline} higher`
                    : `is ${-deltaFromBaseline} lower`}
                {deltaFromBaseline >= 0
                  ? ' — asking for an assumption to go away does not take it off the tray.'
                  : ' — the clauses did retire more than they recruited here, the shallow-escape case.'}
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
                against <strong className="text-foreground/70">{baseline.intraset?.toFixed(2)}</strong> for “
                {baseline.prompt}”. Attribute-level steering works.{' '}
                {(cur.intraset ?? 0) >= (baseline.intraset ?? 0) - 0.02
                  ? 'Distribution-level escape does not happen: the set stays as narrow as it was, or narrower.'
                  : 'Here the clauses did loosen the set a little — the one thing on this page that moves in the direction the remedy promises, and it moves by ' +
                    ((baseline.intraset ?? 0) - (cur.intraset ?? 0)).toFixed(2) +
                    '.'}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 border-t border-border pt-6 md:grid-cols-2">
            <TierNote
              tier="evidence"
              text={
                isSd21(ladderModel)
                  ? 'Eight pairs (wedding and celebration × Nigeria, India, Germany, Egypt) × 50 seeds per rung, the full questionnaire run at every rung. Ladders stop early where a pair had too few named assumptions to counter-specify further.'
                  : `Two pairs (wedding and celebration × Nigeria) × 50 seeds per rung, the same questionnaire at every rung. The clauses are this model's own, chosen from its own headline assumptions, so the ladder is not a replay of SD 2.1's — and the count here is measured against the country-named prompt, not the plain one.`
              }
            />
            {isSd21(ladderModel) ? (
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
            ) : (
              <div className="space-y-2 text-sm leading-6 text-foreground/70">
                {pairSummary.map((r) => (
                  <p key={r.k}>
                    • <strong>a {r.label}</strong>: {r.loads.join(' → ')} —{' '}
                    {r.delta < 0
                      ? `${-r.delta} fewer assumptions than the country prompt alone, so the clauses here do retire more than they recruit`
                      : r.delta === 0
                        ? 'exactly where it started, three clauses later'
                        : `${r.delta} more than the country prompt alone`}
                    . Variety, meanwhile, goes {r.intra.join(' → ')}: the set does not widen.
                  </p>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={0.1}>
        <Panel className="mt-6">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            finding 21 · is naming a country what makes it expensive? · Stable Diffusion 2.1
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-foreground/70">
            Everything above shows that adding words adds assumptions. The obvious next question is whether{' '}
            <em>country</em> words are special in that respect, the way they turned out to be special for variety.
            So we compared them against the same neutral qualifiers from scene 12: “a large wedding”, “a wedding in the
            rain”, “a wedding in 1985”. Same lengths, no culture named. The neutral qualifiers were only ever generated
            on Stable Diffusion 2.1, so this comparison stays there whichever model is selected above.
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
