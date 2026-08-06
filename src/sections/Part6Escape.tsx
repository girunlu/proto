import { useState } from 'react'
import { motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { ZoomImage, BoxPicker, useMagnet } from '../components/Viz'
import { rgb, rgba } from '../lib/colors'
import { C8, COUNTRY8, SITS, cell, seedImg, type Sit, type Code } from '../data/part1'
import { CFG, CFG_VALUES } from '../data/part2'
import { ESCAPE_PAIRS, Q_TEXT, cfgImgCell } from '../data/uiv2'
import { escapeUmap, escapePairsFor, xmEscapeImg, LADDER_MODELS, type XmEscapePair } from '../data/crossmodel'
import { useModel, MODEL_NAME, type ModelId } from '../data/modelContext'
import { isSd21, modelImg, modelSeeds } from '../data/modelData'
import { Sd21Only } from '../components/ModelBar'

const MONO = 'JetBrains Mono'
const SIT_OPTS = SITS.map((s) => ({ value: s, label: `a ${s}` }))
const PAIRS = Object.keys(ESCAPE_PAIRS)
const EVENT_OPTS = [...new Set(PAIRS.map((k) => ESCAPE_PAIRS[k].situation))].map((v) => ({ value: v, label: `a ${v}` }))

/* the two ladder shapes the scene can be handed: SD 2.1's (with the neutral-qualifier
   controls) and a cross-model one (L0 upward, no controls) */
type EscapePairLike = Omit<XmEscapePair, 'levels'> & {
  levels: (XmEscapePair['levels'][number] & { control?: boolean })[]
  final_load_delta?: number
}

/* ── Scene 07 · the guidance knob, swept (F11) ───────────────────────────────
   Moved here from the mechanism part on 2026-08-06: turning guidance up is an
   escape attempt people reach for, so it opens the escape part, before the
   counter-specification ladder. */

function CfgChart({ situation, highlight, onHover, onPick }: {
  situation: Sit
  highlight: Code | null
  /* hovering a line previews that country; clicking pins it. Same two gestures the
     legend below the chart uses, so either entry point behaves identically. */
  onHover: (c: Code | null) => void
  onPick: (c: Code) => void
}) {
  /* 900 × 340 at full panel width pushed the legend, the picture strip and the
     caveat below the fold; 900 × 250 fixed the height but left a 3.6:1 letterbox
     that read as stretched. 780 × 265 is close to 3:1, and the narrower viewBox
     also makes the axis labels relatively larger. */
  const W = 780
  const H = 265
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
        const sole = highlight === c.id
        return (
          <g key={c.id}>
            <motion.path
              d={path}
              fill="none"
              stroke={rgb(c.cv)}
              strokeWidth={sole ? 3 : on ? 2.5 : 1.25}
              strokeOpacity={on ? 1 : 0.22}
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, delay: ci * 0.06 }}
              pointerEvents="none"
            />
            {pts.map((p) => (
              <circle
                key={p.cfg}
                cx={x(p.cfg)}
                cy={y(p.d)}
                r={sole ? 5 : on ? 4 : 2}
                fill={rgb(c.cv)}
                fillOpacity={on ? 1 : 0.22}
                pointerEvents="none"
              />
            ))}
            {/* an invisible fat stroke along the same path: a 2.5px line is too thin
                to hit with a pointer, so this is the actual hit target */}
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="stroke"
              className="cursor-pointer"
              onMouseEnter={() => onHover(c.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onPick(c.id)}
            >
              <title>{`${c.name} — click to keep it singled out`}</title>
            </path>
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

export function CfgScene() {
  const [situation, setSituation] = useState<Sit>('wedding')
  const [code, setCode] = useState<Code>('IN')
  // null = nothing singled out, every line drawn at equal weight
  const [pinned, setPinned] = useState<Code | null>('IN')
  // a transient hover, from either the lines or the legend; it never clears the pin
  const [hoverC, setHoverC] = useState<Code | null>(null)
  const focus = hoverC ?? pinned
  const pick = (c: Code) => { setPinned(pinned === c ? null : c); setCode(c) }
  const shown = [1, 4, 12, 15]
  return (
    <SceneShell
      number="07"
      kicker="Part III · the escape attempts · finding 11"
      title={<>The knob that <em className="font-display italic text-amber-200">doesn't help.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          Every image tool has a guidance slider: turn it up and the model is pushed harder to obey the words you
          typed. If the cultural gap were a matter of the model half-listening, pushing harder would close it. It does
          not. The gap opens almost entirely between guidance 1 and 4, then sits flat all the way to 15, in every one
          of the six events. The guidance sweep was generated for Stable Diffusion 2.1 only.
        </p>
        <Sd21Only />
      </Reveal>
      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <BoxPicker label="event" value={situation} onChange={setSituation} options={SIT_OPTS} size="sm" />

          <div className="mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
                distance from the default prompt at each guidance level
              </div>
              <button
                onClick={() => { setPinned(null); setHoverC(null) }}
                className={`rounded border px-2 py-0.5 font-mono2 text-[10px] transition ${pinned === null ? 'border-amber-300/50 text-amber-200' : 'border-border text-foreground/45 hover:text-foreground'}`}
              >
                show all countries equally
              </button>
            </div>
            <div className="mx-auto max-w-2xl">
              <CfgChart situation={situation} highlight={focus} onHover={setHoverC} onPick={pick} />
            </div>
            {/* fixed legend column: the country labels used to sit at the line
                ends and jumped around whenever the lines crossed */}
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
              {COUNTRY8.map((c) => {
                const end = CFG[situation][c.id]['15'].mean
                const on = focus === null || focus === c.id
                return (
                  <button
                    key={c.id}
                    onMouseEnter={() => setHoverC(c.id)}
                    onMouseLeave={() => setHoverC(null)}
                    onClick={() => pick(c.id)}
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
            <p className="mt-2 font-mono2 text-[10px] text-foreground/55">
              hover a line in the chart or a country here to single it out · click either to keep it that way — the
              picture strip below follows the same choice. Click again, or use the button above, to bring every line
              back to equal weight
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
              text="Distance from the default prompt at each guidance level, 50 seeds per point with bootstrap confidence intervals. It holds in all six events; wedding × Nigeria is the flattest of all, 0.491 at guidance 4 and 0.488 at guidance 15."
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
  /* the rung *id*, not an index: the projection always contains the default prompt,
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
    default: 'default', L0: '+country', L1: 'L1', L2: 'L2', L3: 'L3',
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
            {l === 'default' ? 'default prompt' : l === 'L0' ? 'country named' : l}
          </button>
        ))}
      </div>
      <p className="mt-1 font-mono2 text-[9px] leading-4 text-foreground/40">
        {hover
          ? `${hover.l === 'default' ? 'default prompt' : hover.l === 'L0' ? 'country named' : hover.l} · seed ${hover.s}`
          : 'one dot per seed · rings are each rung\'s centre · click a rung to bring it forward'}
      </p>
    </div>
  )
}


/* Every ladder in the study, on the two axes at once. Derived here rather than
   exported because both halves are already in the bundle: SD 2.1's eight from
   `ui_v2.escape`, the six cross-model ones from `crossmodel.escape`. Each row is
   measured against its own L0 — the country-named prompt — because that is the
   rung the counter-specification is trying to undo, and SD 2.1's ladder starts one
   rung earlier than the cross-model ones. */
/* which models have an own-clause ladder, in prose. Derived so that adding a model
   to the export (sdxl + hunyuandit did exactly that on 2026-08-03) rewrites the
   sentences rather than leaving them a rung behind the chart. */
const XM_LADDER_NAMES = LADDER_MODELS.filter((m) => m !== 'sd21').map((m) =>
  MODEL_NAME[m].replace('Stable Diffusion', 'SD'),
)
const prose = (xs: string[]) =>
  xs.length < 2 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`

export default function Part6Escape() {
  const { model } = useModel()
  const [event, setEvent] = useState('wedding')
  const [country, setCountry] = useState<Code>('NG')
  const [rungId, setRungId] = useState('L0')
  /* Six of the seven models were run up the ladder: SD 2.1 on all eight pairs, and
     the five cross-models on the two Nigeria pairs. Each cross-model has its OWN
     clauses, chosen from its own headline assumptions — that is what makes switching
     model worth doing here, the prompts differ, not just the pictures. Flux is remote
     and has no ladder, so the scene falls back to SD 2.1 there and says so. */
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
     starts one rung earlier (the default prompt), so this cannot be rungs[1] for both. */
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

  /* rung 0 and 1 are that model's own default and country cells, already shipped for
     every model; only L1-L3 need the ladder's own thumbnails */
  const rungImg = (id: string, s: number) =>
    id === 'default'
      ? isSd21(ladderModel) ? seedImg(sit, 'default', seeds[s]) : modelImg(ladderModel, sit, 'default', seeds[s])
      : id === 'L0'
        ? isSd21(ladderModel) ? seedImg(sit, code, seeds[s]) : modelImg(ladderModel, sit, code, seeds[s])
        : xmEscapeImg(ladderModel, pairKey, id, s)

  return (
    <SceneShell
      number="08"
      kicker="Part III · the escape attempts · findings 20–21"
      title={<>Counter-specification: the obvious remedy, <em className="font-display italic text-amber-200">measured.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          If “a wedding in Nigeria” comes out outdoors on every seed, the obvious fix is to say so: write “a wedding in
          Nigeria, indoors.” We built that ladder one clause per named assumption, up to three clauses deep, and
          measured what happened at every rung — eight event-and-country pairs on Stable Diffusion 2.1, and the two
          Nigeria pairs on {prose(XM_LADDER_NAMES)}, each from its own list of assumptions.
        </p>
        <p className="prose-scene mt-4 max-w-2xl">
          The answer, before the ladder rather than after it:{' '}
          <strong className="text-foreground/90">the clauses do work, and the escape still does not happen.</strong>{' '}
          You can change what is in the picture. You cannot change how few pictures there are. The rest of this scene is
          why those two sentences are not a contradiction — and the reason has a shape:{' '}
          <em className="text-amber-200">prompting is additive in an entangled concept space. You can add constraints.
          You can never subtract a prior.</em>
        </p>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            mechanism 1 · entanglement · the ladder · {MODEL_NAME[ladderModel]}
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/70">
            A concept like “an indoor Nigerian wedding” arrives with its own furniture. Flipping one attribute does not
            move the set, because the other attributes were never independent knobs — which is why the two panels below
            disagree: the answers change while the pictures stay the same handful of pictures.
          </p>
          {!isSd21(model) && (
            <p className={`mt-3 mb-4 rounded-md border px-3 py-2 font-mono2 text-[10px] leading-4 ${xm ? 'border-border bg-foreground/[0.04] text-foreground/70' : 'border-amber-300/30 bg-amber-300/5 text-amber-200/90'}`}>
              {xm
                ? `${MODEL_NAME[model]} was run up its own ladder for the two Nigeria pairs, and the clauses below are its own — chosen from its own headline assumptions, so they are not the same words SD 2.1 was given.`
                : `${MODEL_NAME[model]} has no counter-specification ladder: only Stable Diffusion 2.1 (all eight pairs) and Kolors, SD 3.5 Large and Qwen-Image (the two Nigeria pairs) were run. The default and country prompts exist for every model, but a ladder needs the counter-specified rungs, so this scene stays on Stable Diffusion 2.1.`}
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
                  {l.id === 'default' ? 'default prompt' : l.id === 'L0' ? `+ in ${C8[activeCountry].name}` : l.id}
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
              what that prompt generates · 3 of 50 seeds · {MODEL_NAME[ladderModel]}
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
              the same projection Part I uses, read the same way. The default prompt is one cloud, the country prompt is
              another, and the counter-specified rungs stay alongside the country prompt rather than travelling back
              toward the default one. Escaping an attribute does not move the set.
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
                  : `Two pairs (wedding and celebration × Nigeria) × 50 seeds per rung, the same questionnaire at every rung. The clauses are this model's own, chosen from its own headline assumptions, so the ladder is not a replay of SD 2.1's — and the count here is measured against the country-named prompt, not the default one.`
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
                  rehearsed scene was the shallowest to begin with, sitting closest to the default prompt, so resistance
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
        <div className="mx-auto mt-20 max-w-3xl text-center">
          <p className="font-display text-3xl leading-snug font-light text-foreground/90 md:text-4xl">
            You can change what is in the picture.{' '}
            <span className="text-amber-200 italic">You cannot change how few pictures there are.</span>
          </p>
        </div>
      </Reveal>
    </SceneShell>
  )
}
