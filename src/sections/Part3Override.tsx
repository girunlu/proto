import { useState } from 'react'
import { motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { Sd21Only } from '../components/ModelBar'
import { ZoomImage, BoxPicker, BarRow, MetricToggle } from '../components/Viz'
import { rgb } from '../lib/colors'
import { ordinal } from '../lib/utils'
import { C8, COUNTRY8, SITS, CV_DEFAULT, type Sit, type Code } from '../data/part1'
import { VENDI_CELL, ESCAPE_PAIRS, key, controlImg } from '../data/uiv2'
import { useModel, modelImg, modelSeeds, isSd21, MODEL_NAME } from '../data/modelData'
import { intraset as xmIntraset, realityFor, dissimilarSeeds, RULER_MAX, type Ruler } from '../data/crossmodel'

const SIT_OPTS = SITS.map((s) => ({ value: s, label: `a ${s}` }))
const CODE_BOXES = COUNTRY8.map((c) => ({ value: c.id, label: c.name, cv: c.cv }))

/* ── Scene 11 · the stereotyping inversion (F6) ──────────────────────────── */

const MOSAIC_N = 20
/* the tile wall in the variety meter shows the same count */

function CellMosaics({ situation, code }: { situation: Sit; code: Code }) {
  const { model } = useModel()
  /* Tier C: instead of the first 8 or a typicality spread, these are the 20 LEAST
     alike images in the set (greedy farthest-point in DINOv3 space). It is the
     fairest possible slice for this scene's claim: if even the 20 most different
     pictures of "a celebration in Nigeria" look like each other, that is the
     finding, and a curated-for-variety grid cannot be accused of hiding it. */
  const picks = (c: Code | 'default') =>
    dissimilarSeeds(model, situation, c, MOSAIC_N) ?? modelSeeds(model, situation, c, 8)
  const sides: { code: Code | 'default'; label: string; cv: string }[] = [
    { code: 'default', label: `“a ${situation}”`, cv: CV_DEFAULT },
    { code, label: `“a ${situation} in ${C8[code].name}”`, cv: C8[code].cv },
  ]
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sides.map((s) => {
        const v = isSd21(model) ? VENDI_CELL[key(situation, s.code)] : null
        return (
          <div key={s.code} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono2 text-[11px]" style={{ color: rgb(s.cv) }}>{s.label}</span>
              {v != null && (
                <span className="font-mono2 text-[10px] text-foreground/45">
                  about {v.toFixed(0)} different pictures in 50
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {picks(s.code).map((seed, i) => (
                <ZoomImage
                  key={seed}
                  src={modelImg(model, situation, s.code, seed)}
                  alt={`${situation} ${s.code} seed ${seed}`}
                  caption={`${s.label} · ${MODEL_NAME[model]} · seed ${seed} · ${ordinal(i + 1)} most different of 50`}
                  imgClassName="aspect-square w-full cursor-zoom-in rounded-md border border-border object-cover"
                />
              ))}
            </div>
            <p className="mt-2 font-mono2 text-[9px] leading-4 text-foreground/45">
              the {MOSAIC_N} <em>least</em> alike pictures of the 50, chosen by the embeddings rather than by us —
              picked most-different-first, so this is the most varied face this set has
            </p>
          </div>
        )
      })}
    </div>
  )
}

function InversionScene() {
  const [sit, setSit] = useState<Sit>('celebration')
  const [code, setCode] = useState<Code>('NG')
  const [ruler, setRuler] = useState<Ruler>('dinov3')
  const { model } = useModel()
  const onSd21 = isSd21(model)
  /* Tier C: intra-set similarity now exists for all seven models under both rulers,
     each with its own 10,000-resample interval, so this scene stopped being an
     SD-2.1 chart with six read-only copies. */
  const intra = (c: Code | 'default') => xmIntraset(model, sit, c, ruler)
  const defIntra = intra('default')
  const cIntra = intra(code)
  const maxIntra = RULER_MAX[ruler].intraset
  /* "distinct pictures out of 50": SD 2.1 has a Vendi score per cell; the other six
     models have theirs from the reality-anchor export. */
  const distinct = (c: Code | 'default') =>
    onSd21 ? VENDI_CELL[key(sit, c)] : c === 'default' ? undefined : realityFor(model, sit, c)?.gen_vendi
  return (
    <SceneShell
      number="X1"
      kicker="extras · the override · finding 6 · the most novel result"
      title={<>Naming a country <em className="font-display italic text-red-300">narrows</em> the output below the default prompt.</>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          You would expect adding a country to make the output more specific, but not less varied. The opposite
          happens. Ask for “a celebration” and every seed invents something different. Ask for “a celebration in
          Nigeria” and you get the same green-and-white rally crowd, over and over. Pick any event and any country
          below and check it yourself.
        </p>
      </Reveal>

      <Reveal delay={0.06}>
        <Panel className="mt-10">
          <div className="flex flex-wrap items-end gap-4">
            <BoxPicker label="event" value={sit} onChange={setSit} options={SIT_OPTS} size="sm" />
            <BoxPicker label="country" value={code} onChange={setCode} options={CODE_BOXES} size="sm" />
          </div>
          <div className="mt-6">
            <CellMosaics situation={sit} code={code} />
          </div>
        </Panel>
      </Reveal>

      {/* One measurement panel, not three. The old middle panel repeated this one for a
          single pair — same "N distinct" number, same tile wall as the mosaics above,
          and its own duplicate event/country pickers. Folded in: the nine rows below
          carry the count, and the selected row IS the pair the mosaics are showing. */}
      <Reveal delay={0.08}>
        <Panel className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
              how much variety survives · all nine prompts of “a {sit}” · pick a row
            </div>
            <MetricToggle value={ruler} onChange={setRuler} />
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/60">
            Each bar is how alike a prompt's 50 pictures are to each other. A short bar means every seed invented
            something different. A long bar means the model generated nearly the same picture 50 times. The default prompt is
            the reference line at the top, and the highlighted row is the one shown in the pictures above.
          </p>
          <div className="mt-6 space-y-2.5">
            <BarRow
              label={<span className="text-foreground/80">“a {sit}”</span>}
              value={defIntra.mean}
              ci={[defIntra.ci_low, defIntra.ci_high]}
              max={maxIntra}
              color={CV_DEFAULT}
              right={distinct('default') != null ? `${distinct('default')!.toFixed(0)} distinct` : undefined}
            />
            <div className="h-px bg-border" />
            {COUNTRY8.map((c, i) => {
              const v = intra(c.id)
              return (
                <BarRow
                  key={c.id}
                  label={`…in ${c.name}`}
                  value={v.mean}
                  ci={[v.ci_low, v.ci_high]}
                  max={maxIntra}
                  color={c.cv}
                  delay={i * 0.05}
                  right={distinct(c.id) != null ? `${distinct(c.id)!.toFixed(0)} distinct` : undefined}
                  selected={c.id === code}
                  onSelect={() => setCode(c.id)}
                />
              )
            })}
            <div className="flex items-center gap-3 pt-1">
              <span className="w-32 shrink-0" />
              <div className="flex flex-1 justify-between font-mono2 text-[10px] text-foreground/30">
                <span>← every seed different</span>
                <span>nearly the same picture every seed →</span>
              </div>
              <span className="w-14 shrink-0" />
              <span className="w-28 shrink-0" />
            </div>
          </div>
          <div className="mt-6 grid gap-4 border-t border-border pt-5 md:grid-cols-2">
            <TierNote
              tier="evidence"
              text={`Mean pairwise similarity inside each 50-seed set of ${MODEL_NAME[model]}, measured with ${ruler === 'dinov3' ? 'DINOv3' : 'CLIP'}, with 10,000-resample bootstrap intervals drawn through each bar. Both rulers and all seven models are real measurements here, not one model's numbers reused.`}
            />
            <p className="text-sm leading-6 text-foreground/60">
              {/* B5: 0.65 was hardcoded here — true only for SD 2.1 under DINOv3.
                  The real value spans 0.46–0.75 across the seven models and two rulers,
                  so it now comes from the same table the chart above is drawn from. */}
              {sit === 'funeral'
                ? `The honest exception: the default funeral prompt is already narrow (${defIntra.mean.toFixed(2)}), since a Western church interior is itself a stereotype, so the country qualifier cannot narrow it much further. The comparison is always against the default prompt, never against zero.`
                : cIntra.mean > defIntra.mean
                  ? `For “a ${sit}”, naming ${C8[code].name} takes the set from ${defIntra.mean.toFixed(2)} to ${cIntra.mean.toFixed(2)}: more alike, not less.`
                  : `For “a ${sit}”, ${C8[code].name} is one of the cases that does not narrow the set. We show every country rather than only the ones that make the point.`}
            </p>
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Scene 12 · specifically cultural (F7) ───────────────────────────────── */

/* the sign comes from the value: a hardcoded "+" printed "+-0.04" on the one row
   (wedding × Germany) whose country qualifier makes the set MORE varied */
const signed = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}`

/* The prose used to say the neutral qualifiers "sit on the line" full stop. One of
   them does not — “in the rain” on the celebration rows — so the exception is
   derived here and named on the page rather than rounded away. */
const CTRL_DELTAS = Object.values(ESCAPE_PAIRS).flatMap((p) => {
  const plain = p.levels.find((l) => l.id === 'default')?.intraset
  if (plain == null) return []
  return p.levels
    .filter((l) => l.control && l.intraset != null)
    .map((l) => ({ prompt: l.prompt, d: l.intraset! - plain }))
})
const COUNTRY_DELTAS = Object.values(ESCAPE_PAIRS).flatMap((p) => {
  const plain = p.levels.find((l) => l.id === 'default')?.intraset
  const country = p.levels.find((l) => l.id === 'L0')?.intraset
  return plain == null || country == null ? [] : [country - plain]
})
const CTRL_SORTED = [...CTRL_DELTAS].sort((a, b) => b.d - a.d)
const CTRL_WORST = CTRL_SORTED[0]
const CTRL_NEXT = CTRL_SORTED.find((c) => c.d < CTRL_WORST.d)!
const CTRL_WORST_BEATS = COUNTRY_DELTAS.filter((d) => d < CTRL_WORST.d).length

const CTRL_LABEL: Record<string, string> = {
  ctrl_large: 'a large one',
  ctrl_rain: 'in the rain',
  ctrl_1985: 'in 1985',
}

/* Plotted as the CHANGE from each row's own default prompt, not as raw similarity.
   On the raw scale every mark piled into the right-hand third and the rows were
   not comparable, because "a wedding" and "a celebration" start from different
   baselines. Zero is now the same thing in every row: the default prompt. */
function SpecificityRows() {
  const [hover, setHover] = useState<{ row: string; label: string; d: number } | null>(null)
  const pairs = Object.entries(ESCAPE_PAIRS)
  const lo = -0.12
  const hi = 0.32
  const pos = (d: number) => `${((d - lo) / (hi - lo)) * 100}%`

  return (
    <div>
      {/* One shared zero line down the whole chart. It has to live inside a copy
          of the row skeleton (label · gap · bar · value): pos() is a percentage,
          and in a calc() on the outer container that percentage resolved against
          the FULL row width instead of the bar's, so the line and the dots — which
          are positioned inside the bar — did not agree. */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 flex gap-3">
          <span className="w-44 shrink-0" />
          <div className="relative flex-1">
            <span className="absolute top-5 bottom-8 w-px bg-foreground/30" style={{ left: pos(0) }} />
          </div>
          <span className="w-14 shrink-0" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-44 shrink-0" />
            <div className="relative h-4 flex-1">
              {[-0.1, 0, 0.1, 0.2, 0.3].map((v) => (
                <span
                  key={v}
                  className="absolute -translate-x-1/2 font-mono2 text-[9px] text-foreground/40"
                  style={{ left: pos(v) }}
                >
                  {v === 0 ? 'default prompt' : `${v > 0 ? '+' : ''}${v.toFixed(1)}`}
                </span>
              ))}
            </div>
            <span className="w-14 shrink-0" />
          </div>

          {pairs.map(([pairKey, p]) => {
            const plain = p.levels.find((l) => l.id === 'default')?.intraset
            const country = p.levels.find((l) => l.id === 'L0')?.intraset
            const ctrls = p.levels.filter((l) => l.control && l.intraset != null)
            if (plain == null || country == null) return null
            const cv = C8[p.code].cv
            return (
              <div key={pairKey} className="flex items-center gap-3">
                <span className="w-44 shrink-0 text-right font-mono2 text-[11px] leading-4 text-foreground/60">
                  a {p.situation} in {C8[p.code].name}
                </span>
                <div className="relative h-8 flex-1 rounded-md bg-foreground/5">
                  {ctrls.map((c) => {
                    const d = c.intraset! - plain
                    return (
                      <span
                        key={c.id}
                        className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-help rounded-full border-2 border-foreground/55 bg-background"
                        style={{ left: pos(d) }}
                        onMouseEnter={() => setHover({ row: pairKey, label: `“${c.prompt}”`, d })}
                        onMouseLeave={() => setHover(null)}
                      />
                    )
                  })}
                  {/* the centering lives on a plain wrapper, NOT on the motion element:
                      framer-motion writes its own `transform` for the scale animation and
                      overwrites -translate-x/y-1/2, which left this dot half its own size
                      down and to the right of the value it marks — while the hollow
                      control dots beside it, being plain spans, stayed correct. */}
                  <span
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: pos(country - plain) }}
                  >
                    <motion.span
                      className="block cursor-help rounded-full"
                      style={{ background: rgb(cv), height: 18, width: 18 }}
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      onMouseEnter={() => setHover({ row: pairKey, label: `“a ${p.situation} in ${C8[p.code].name}”`, d: country - plain })}
                      onMouseLeave={() => setHover(null)}
                    />
                  </span>
                </div>
                <span className="w-14 shrink-0 text-right font-mono2 text-xs" style={{ color: rgb(cv) }}>
                  {signed(country - plain)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <span className="w-44 shrink-0" />
        <div className="flex flex-1 justify-between font-mono2 text-[10px] text-foreground/35">
          <span>← more varied than the default prompt</span>
          <span>less varied than the default prompt →</span>
        </div>
        <span className="w-14 shrink-0" />
      </div>

      <div className="mt-4 flex min-h-[18px] flex-wrap items-center gap-5 border-t border-border pt-3 font-mono2 text-[10px] text-foreground/50">
        {hover ? (
          <span className="text-foreground/80">
            {hover.label}: {signed(hover.d)} against its own default prompt
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1.5"><span className="h-4 w-px bg-foreground/40" /> the default prompt, at zero in every row</span>
            <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full border-2 border-foreground/55" /> a neutral qualifier: {Object.values(CTRL_LABEL).join(' / ')}</span>
            <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded-full bg-red-400" /> the country qualifier</span>
          </>
        )}
      </div>
    </div>
  )
}

function SpecificityScene() {
  const [which, setWhich] = useState<'wedding' | 'celebration'>('wedding')
  return (
    <SceneShell
      number="X2"
      kicker="extras · the override · finding 7"
      title={<>The collapse is <em className="font-display italic text-red-300">specifically cultural.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          The obvious objection is that <em>any</em> extra words narrow the output: “a large wedding” would do it too.
          So we built matched neutral qualifiers of the same length and ran them through the identical protocol. They
          land on top of the default prompt. Only the country qualifier moves the set.
        </p>
        <Sd21Only />
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            all eight tested pairs · four countries, two events
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/60">
            Every mark is plotted as the <em>change</em> from its own row's default prompt, so the vertical line means
            the same thing in all eight rows: no change in variety. Marks to the right of it are less varied than the
            default prompt, marks to the left are more varied.
          </p>
          <div className="mt-6">
            <SpecificityRows />
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-foreground/60">
            The hollow dots are the neutral qualifiers, and they sit on or beside the line: adding “a large”, “in the
            rain” or “in 1985” leaves the variety roughly where it was, every one of them inside{' '}
            {signed(CTRL_NEXT.d)} — with one exception, <em>{CTRL_WORST.prompt}</em> at {signed(CTRL_WORST.d)}, which
            narrows the set further than the country name does in {CTRL_WORST_BEATS} of the eight rows. The filled dot
            is the country qualifier, and in seven of the eight rows it has moved clearly right. Same length, same
            grammar, same model.
          </p>
        </Panel>
      </Reveal>

      <Reveal delay={0.1}>
        <Panel className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
              what the neutral qualifiers actually generated
            </div>
            <BoxPicker
              label="event"
              value={which}
              onChange={setWhich}
              options={[{ value: 'wedding' as const, label: 'a wedding' }, { value: 'celebration' as const, label: 'a celebration' }]}
              size="sm"
            />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {(['ctrl_large', 'ctrl_rain', 'ctrl_1985'] as const).map((ctrl) => {
              const lvl = ESCAPE_PAIRS[`${which}_NG`]?.levels.find((l) => l.id === ctrl)
              return (
                <div key={ctrl} className="rounded-lg border border-border p-2.5">
                  <div className="font-mono2 text-[10px] text-foreground/60">“{lvl?.prompt}”</div>
                  <div className="mt-2 grid grid-cols-3 gap-1">
                    {[0, 1, 2].map((s) => (
                      <ZoomImage
                        key={s}
                        src={controlImg(`${which}_NG`, ctrl, s)}
                        alt={`${lvl?.prompt} seed ${s}`}
                        caption={`“${lvl?.prompt}” · seed ${s}`}
                        imgClassName="aspect-square w-full cursor-zoom-in rounded-md border border-border object-cover"
                      />
                    ))}
                  </div>
                  <div className="mt-1.5 font-mono2 text-[9px] text-foreground/40">
                    stays at the default prompt's variety ({lvl?.intraset?.toFixed(2)})
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/60">
            The weddings get bigger, wetter or more retro, but they do not collapse into one repeated scene. Images for
            the neutral qualifiers were only generated for the two Nigeria pairs; the measurements above cover all
            eight, which is why the chart is the evidence and this row is the illustration.
          </p>
          <div className="mt-6 border-t border-border pt-5">
            <TierNote
              tier="evidence"
              text="Matched neutral qualifiers (“a large …”, “… in the rain”, “… in 1985”) on the same events, same 50-seed protocol, same measurement. The variety collapse is culture-specific; the extra assumption load that any qualifier brings is not — that load is the ladder scene below (X4)."
            />
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}

/* ── Part III ────────────────────────────────────────────────────────────────
   Scene 13 (the sub-cluster breakdown) was cut: the clusters did not read as
   meaningful once you looked at the images they group. What it was reaching for
   (naming the recurring scene recipe) is done properly by the open-question
   answers in scene 13 below. */

export default function Part3Override() {
  return (
    <>
      <InversionScene />
      <SpecificityScene />
    </>
  )
}
