import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { ZoomImage, Picker, BarRow, MetricToggle } from '../components/Viz'
import { rgb } from '../lib/colors'
import { C8, COUNTRY8, SITS, CV_DEFAULT, cell, seedImg, type Sit, type Code } from '../data/part1'
import { VENDI_CELL, ESCAPE_PAIRS, INTRASET_CLIP, key, controlImg } from '../data/uiv2'
import { useModel, modelImg, modelSeeds, modelIntraset, isSd21, MODEL_NAME } from '../data/modelData'

const SIT_OPTS = SITS.map((s) => ({ value: s, label: `a ${s}` }))
const CODE_OPTS = COUNTRY8.map((c) => ({ value: c.id, label: c.name }))

/* ── Scene 11 · the stereotyping inversion (F6) ──────────────────────────── */

function CellMosaics({ situation, code }: { situation: Sit; code: Code }) {
  const { model } = useModel()
  const picks = (c: Code | 'default') => modelSeeds(model, situation, c, 8)
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
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {picks(s.code).map((seed) => (
                <ZoomImage
                  key={seed}
                  src={modelImg(model, situation, s.code, seed)}
                  alt={`${situation} ${s.code} seed ${seed}`}
                  caption={`${s.label} · ${MODEL_NAME[model]} · seed ${seed}`}
                  imgClassName="aspect-square w-full cursor-zoom-in rounded-md border border-border object-cover"
                />
              ))}
            </div>
            <p className="mt-2 font-mono2 text-[9px] text-foreground/35">
              {isSd21(model)
                ? '8 seeds spread evenly across the whole 50-image set, most typical to most unusual'
                : `${MODEL_NAME[model]}, its own seeds straight off the run, no curation`}
            </p>
          </div>
        )
      })}
    </div>
  )
}

/* The Vendi score, made concrete: 50 seeds generated, this many genuinely
   different pictures come back. */
function DistinctMeter({ situation, code, setSituation, setCode }: {
  situation: Sit
  code: Code
  setSituation: (s: Sit) => void
  setCode: (c: Code) => void
}) {
  const { model } = useModel()
  const [side, setSide] = useState<'default' | 'country'>('country')
  const target: Code | 'default' = side === 'default' ? 'default' : code
  const v = VENDI_CELL[key(situation, target)] ?? 0
  const lit = Math.round(v)
  const cv = side === 'default' ? CV_DEFAULT : C8[code].cv
  const t = cell(situation, target).typical_order

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        <Picker label="event" value={situation} onChange={setSituation} options={SIT_OPTS} />
        <Picker label="country" value={code} onChange={setCode} options={CODE_OPTS} accent={C8[code].cv} />
      </div>
      <div className="mt-5 flex w-fit overflow-hidden rounded-md border border-border font-mono2 text-xs">
        <button
          onClick={() => setSide('default')}
          className={`px-3 py-1.5 transition ${side === 'default' ? 'bg-foreground/10 text-foreground' : 'text-foreground/40 hover:text-foreground/70'}`}
        >
          “a {situation}”
        </button>
        <button
          onClick={() => setSide('country')}
          className={`px-3 py-1.5 transition ${side === 'country' ? 'bg-foreground/10 text-foreground' : 'text-foreground/40 hover:text-foreground/70'}`}
        >
          “…in {C8[code].name}”
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-mono2 text-6xl" style={{ color: rgb(cv) }}>
          <AnimatePresence mode="wait">
            <motion.span
              key={`${target}-${situation}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
              className="inline-block"
            >
              {v.toFixed(0)}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="text-sm leading-6 text-foreground/60">
          genuinely different pictures, out of 50 generated.
          <br />
          <span className="text-foreground/40">The other {50 - lit} repeat what those already showed.</span>
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-1">
        {t.map((seed, rank) => (
          <span key={seed} className="block" style={{ opacity: rank < lit ? 1 : 0.28 }}>
            <ZoomImage
              src={seedImg(situation, target, seed)}
              alt={`${situation} ${target} seed ${seed}`}
              caption={`“a ${situation}${target === 'default' ? '' : ` in ${C8[code].name}`}” · seed ${seed}`}
              imgClassName="h-10 w-10 cursor-zoom-in rounded-sm border border-border object-cover"
            />
          </span>
        ))}
      </div>
      {!isSd21(model) && (
        <p className="mt-3 rounded-md border border-amber-300/30 bg-amber-300/5 px-3 py-2 font-mono2 text-[10px] leading-4 text-amber-200/90">
          This count was computed on Stable Diffusion 2.1's full 50-seed run, so it stays on that model. The bar chart
          below and the images above follow {MODEL_NAME[model]}.
        </p>
      )}
      <p className="mt-3 font-mono2 text-[10px] leading-4 text-foreground/40">
        All 50 seeds are shown. The number of lit tiles is the measured count of effectively distinct
        pictures (a Vendi score, computed on the image embeddings). The score says how many, not which
        ones, so which specific tiles are lit here is arbitrary. The count is not.
      </p>
    </div>
  )
}

function InversionScene() {
  const [sit, setSit] = useState<Sit>('celebration')
  const [code, setCode] = useState<Code>('NG')
  const [ruler, setRuler] = useState<'dinov3' | 'clip'>('dinov3')
  const { model } = useModel()
  const onSd21 = isSd21(model)
  const intra = (c: Code | 'default') =>
    onSd21
      ? (ruler === 'dinov3' ? cell(sit, c).intraset : INTRASET_CLIP[key(sit, c)])
      : modelIntraset(model, sit, c, 'dinov3')!
  const defIntra = intra('default')
  const cIntra = intra(code)
  const maxIntra = onSd21 && ruler === 'clip' ? 1 : 0.9
  return (
    <SceneShell
      number="11"
      kicker="Part III · the override · finding 6 · the most novel result"
      title={<>Naming a country <em className="font-display italic text-red-300">narrows</em> the output below the plain prompt.</>}
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
            <Picker label="event" value={sit} onChange={setSit} options={SIT_OPTS} />
            <Picker label="country" value={code} onChange={setCode} options={CODE_OPTS} accent={C8[code].cv} />
          </div>
          <div className="mt-6">
            <CellMosaics situation={sit} code={code} />
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-6">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            how much variety survives · “a {sit}” against “…in {C8[code].name}”
          </div>
          <div className="mt-6">
            <DistinctMeter situation={sit} code={code} setSituation={setSit} setCode={setCode} />
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
              the same comparison for all nine prompts of “a {sit}”
            </div>
            {onSd21 && <MetricToggle value={ruler} onChange={setRuler} />}
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/60">
            Each bar is how alike a prompt's 50 pictures are to each other. A short bar means every seed invented
            something different. A long bar means the model drew nearly the same picture 50 times. The plain prompt is
            the reference line at the top.
          </p>
          <div className="mt-6 space-y-2.5">
            <BarRow
              label={<span className="text-foreground/80">“a {sit}”</span>}
              value={defIntra.mean}
              ci={[defIntra.ci_low, defIntra.ci_high]}
              max={maxIntra}
              color={CV_DEFAULT}
              right={onSd21 ? `${VENDI_CELL[key(sit, 'default')]?.toFixed(0)} distinct` : undefined}
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
                  right={onSd21 ? `${VENDI_CELL[key(sit, c.id)]?.toFixed(0)} distinct` : undefined}
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
              text="Mean pairwise similarity inside each 50-seed set, with bootstrap confidence intervals shown as the short line under each bar. The direction of this effect replicates across all 7 models (Branch A)."
            />
            <p className="text-sm leading-6 text-foreground/60">
              {sit === 'funeral'
                ? 'The honest exception: the plain funeral is already narrow (0.65), since a Western church interior is itself a stereotype, so the country qualifier cannot narrow it much further. The comparison is always against the plain prompt, never against zero.'
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

const CTRL_LABEL: Record<string, string> = {
  ctrl_large: 'a large one',
  ctrl_rain: 'in the rain',
  ctrl_1985: 'in 1985',
}

/* Plotted as the CHANGE from each row's own plain prompt, not as raw similarity.
   On the raw scale every mark piled into the right-hand third and the rows were
   not comparable, because "a wedding" and "a celebration" start from different
   baselines. Zero is now the same thing in every row: the plain prompt. */
function SpecificityRows() {
  const [hover, setHover] = useState<{ row: string; label: string; d: number } | null>(null)
  const pairs = Object.entries(ESCAPE_PAIRS)
  const lo = -0.12
  const hi = 0.32
  const pos = (d: number) => `${((d - lo) / (hi - lo)) * 100}%`

  return (
    <div>
      {/* one shared zero line down the whole chart */}
      <div className="relative">
        <div
          className="pointer-events-none absolute top-5 bottom-8 w-px bg-foreground/30"
          style={{ left: `calc(11rem + 0.75rem + ${pos(0)})` }}
        />
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
                  {v === 0 ? 'plain prompt' : `${v > 0 ? '+' : ''}${v.toFixed(1)}`}
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
                  <motion.span
                    className="absolute top-1/2 h-4.5 w-4.5 -translate-x-1/2 -translate-y-1/2 cursor-help rounded-full"
                    style={{ background: rgb(cv), left: pos(country - plain), height: 18, width: 18 }}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    onMouseEnter={() => setHover({ row: pairKey, label: `“a ${p.situation} in ${C8[p.code].name}”`, d: country - plain })}
                    onMouseLeave={() => setHover(null)}
                  />
                </div>
                <span className="w-14 shrink-0 text-right font-mono2 text-xs" style={{ color: rgb(cv) }}>
                  +{(country - plain).toFixed(2)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <span className="w-44 shrink-0" />
        <div className="flex flex-1 justify-between font-mono2 text-[10px] text-foreground/35">
          <span>← more varied than the plain prompt</span>
          <span>less varied than the plain prompt →</span>
        </div>
        <span className="w-14 shrink-0" />
      </div>

      <div className="mt-4 flex min-h-[18px] flex-wrap items-center gap-5 border-t border-border pt-3 font-mono2 text-[10px] text-foreground/50">
        {hover ? (
          <span className="text-foreground/80">
            {hover.label}: {hover.d > 0 ? '+' : ''}{hover.d.toFixed(2)} against its own plain prompt
          </span>
        ) : (
          <>
            <span className="flex items-center gap-1.5"><span className="h-4 w-px bg-foreground/40" /> the plain prompt, at zero in every row</span>
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
      number="12"
      kicker="Part III · the override · finding 7"
      title={<>The collapse is <em className="font-display italic text-red-300">specifically cultural.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          The obvious objection is that <em>any</em> extra words narrow the output: “a large wedding” would do it too.
          So we built matched neutral qualifiers of the same length and ran them through the identical protocol. They
          land on top of the plain prompt. Only the country qualifier moves the set.
        </p>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-10">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            all eight tested pairs · four countries, two events
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/60">
            Every mark is plotted as the <em>change</em> from its own row's plain prompt, so the vertical line means
            the same thing in all eight rows: no change in variety. Marks to the right of it are less varied than the
            plain prompt, marks to the left are more varied.
          </p>
          <div className="mt-6">
            <SpecificityRows />
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-foreground/60">
            The hollow dots are the neutral qualifiers, and they sit on the line: adding “a large”, “in the rain” or
            “in 1985” leaves the variety roughly where it was. The filled dot is the country qualifier, and in seven of
            the eight rows it has moved clearly right. Same length, same grammar, same model.
          </p>
        </Panel>
      </Reveal>

      <Reveal delay={0.1}>
        <Panel className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
              what the neutral qualifiers actually drew
            </div>
            <Picker
              label="event"
              value={which}
              onChange={setWhich}
              options={[{ value: 'wedding' as const, label: 'a wedding' }, { value: 'celebration' as const, label: 'a celebration' }]}
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
                    stays at the plain prompt's variety ({lvl?.intraset?.toFixed(2)})
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
              text="Matched neutral qualifiers (“a large …”, “… in the rain”, “… in 1985”) on the same events, same 50-seed protocol, same measurement. The variety collapse is culture-specific; the extra assumption load that any qualifier brings is not, which is scene 18."
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
