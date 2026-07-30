import { useState } from 'react'
import { motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { ZoomImage, BoxPicker } from '../components/Viz'
import { rgb, rgba } from '../lib/colors'
import { C8, COUNTRY8, SITS, cell, type Sit, type Code } from '../data/part1'
import { REALITY_ANCHOR, DISTORTION, REAL_PHOTOS_N, REAL_CELLS_N, REAL_PER_CELL } from '../data/part5'
import { REALITY_ATTRS, REAL_CREDITS, VQA, realImg, key, Q_TEXT } from '../data/uiv2'
import { useModel, modelImg, modelSeeds, MODEL_NAME as UI_MODEL_NAME, isSd21 } from '../data/modelData'
import { realityFor } from '../data/crossmodel'

const SIT_OPTS = SITS.map((s) => ({ value: s, label: `a ${s}` }))
const CODE_OPTS = COUNTRY8.map((c) => ({ value: c.id, label: c.name, cv: c.cv }))
const SLUG: Record<Code, string> = {
  US: 'united_states', DE: 'germany', RU: 'russia', ID: 'indonesia',
  JP: 'japan', EG: 'egypt', IN: 'india', NG: 'nigeria',
}

/* the model names, written the way their makers write them */
const MODEL_NAME: Record<string, string> = {
  sd21: 'Stable Diffusion 2.1',
  flux: 'FLUX.1 [dev]',
  kolors: 'Kolors',
  sdxl: 'SDXL 1.0',
  sd35: 'Stable Diffusion 3.5 Large',
  qwenimage: 'Qwen-Image',
  hunyuandit: 'HunyuanDiT',
}

/* F18: is the model narrower than reality? Drawn in SVG: the previous version
   animated CSS-translated dots, and the inline transform framer-motion writes
   replaced the centring translate, so every dot sat below its own line. */
function HomogeneityDumbbells({ sit }: { sit: Sit }) {
  const { model } = useModel()
  /* Tier C: the generated side follows the model switch. The photographs do not —
     they are the same 2,977 pictures whichever model is being judged, which is the
     whole point of having a reality anchor. */
  const rows = COUNTRY8.map((c) => {
    const r = REALITY_ANCHOR[sit]?.[SLUG[c.id]]
    const own = realityFor(model, sit, c.id)
    return r?.real_intraset_sim && own
      ? { name: c.name, cv: c.cv, generated: own.gen_intra, real: r.real_intraset_sim.value }
      : null
  }).filter((r): r is NonNullable<typeof r> => r !== null)

  const W = 900
  const rowH = 34
  const H = rows.length * rowH + 38
  const padL = 150
  const padR = 130
  const max = 0.9
  const X = (v: number) => padL + (v / max) * (W - padL - padR)

  return (
    <div className="mx-auto max-w-3xl">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 0.3, 0.6, 0.9].map((v) => (
          <g key={v}>
            <line x1={X(v)} x2={X(v)} y1={4} y2={rows.length * rowH} stroke="hsl(var(--grid))" strokeDasharray="3 5" />
            <text x={X(v)} y={rows.length * rowH + 16} textAnchor="middle" fontSize="9" fill="hsl(var(--svg-fg))" fontFamily="JetBrains Mono">
              {v.toFixed(1)}
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const y = i * rowH + rowH / 2
          return (
            <g key={r.name}>
              <text x={padL - 10} y={y + 3.5} textAnchor="end" fontSize="11" fill="hsl(var(--foreground) / 0.6)" fontFamily="JetBrains Mono">
                {r.name}
              </text>
              <motion.line
                x1={X(Math.min(r.generated, r.real))}
                x2={X(Math.max(r.generated, r.real))}
                y1={y}
                y2={y}
                stroke={rgba(r.cv, 0.55)}
                strokeWidth={2}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.05 }}
              />
              <circle cx={X(r.real)} cy={y} r={6} fill="none" stroke={rgb(r.cv)} strokeWidth={2}>
                <title>{`real photos: ${r.real.toFixed(2)}`}</title>
              </circle>
              <circle cx={X(r.generated)} cy={y} r={6} fill={rgb(r.cv)}>
                <title>{`generated: ${r.generated.toFixed(2)}`}</title>
              </circle>
              <text x={W - padR + 10} y={y + 3.5} fontSize="10" fill="hsl(var(--foreground) / 0.5)" fontFamily="JetBrains Mono">
                {r.real.toFixed(2)} → {r.generated.toFixed(2)}
              </text>
            </g>
          )
        })}
        <text x={X(0)} y={H - 3} fontSize="9" fill="hsl(var(--svg-fg))" fontFamily="JetBrains Mono">
          ← photos of the same event look nothing alike
        </text>
        <text x={W - padR} y={H - 3} textAnchor="end" fontSize="9" fill="hsl(var(--svg-fg))" fontFamily="JetBrains Mono">
          they all look the same →
        </text>
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-5 font-mono2 text-[10px] text-foreground/50">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-foreground/70" /> real photographs</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-foreground/70" /> what the model generates</span>
      </div>
    </div>
  )
}

/* F19: which way does the model err when it contradicts the photographs?
   Counts alone were unreadable because the models have different numbers of
   contradictions; each row is now that model's own split, as percentages. */
function DistortionBars() {
  const entries = [
    { id: 'sd21', ...DISTORTION.sd21 },
    ...Object.entries(DISTORTION.models).map(([id, v]) => ({ id, ...v })),
  ].map((e) => ({ ...e, total: e.toward_default + e.toward_reality }))
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 pb-1">
        <span className="w-44 shrink-0" />
        <span className="flex-1 font-mono2 text-[10px] text-foreground/40">
          each bar is 100% of that model's disagreements with the photographs
        </span>
        <span className="w-20 shrink-0 text-right font-mono2 text-[10px] text-foreground/40">disagreements</span>
      </div>
      {entries.map((e, i) => {
        const pd = e.toward_default / e.total
        return (
          <div key={e.id} className="flex items-center gap-3">
            <span className="w-44 shrink-0 text-right font-mono2 text-[11px] text-foreground/60">{MODEL_NAME[e.id] ?? e.id}</span>
            <div className="flex h-6 flex-1 overflow-hidden rounded-sm">
              <motion.div
                className="flex items-center justify-end bg-red-400/70"
                initial={{ width: 0 }}
                whileInView={{ width: `${pd * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.05 }}
              >
                <span className="pr-2 font-mono2 text-[10px] text-white/90">{Math.round(pd * 100)}%</span>
              </motion.div>
              <motion.div
                className="flex items-center bg-emerald-400/55"
                initial={{ width: 0 }}
                whileInView={{ width: `${(1 - pd) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.05 }}
              >
                <span className="pl-2 font-mono2 text-[10px] text-foreground/80">{Math.round((1 - pd) * 100)}%</span>
              </motion.div>
            </div>
            <span className="w-20 shrink-0 text-right font-mono2 text-[10px] text-foreground/45">{e.total}</span>
          </div>
        )
      })}
      <div className="flex flex-wrap items-center gap-5 pt-2 font-mono2 text-[10px] text-foreground/50">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-400/70" /> leans toward its own default world</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400/55" /> leans toward the photographs</span>
        <span className="text-foreground/45">a model with no pull either way would sit at 50/50</span>
      </div>
    </div>
  )
}

/* what one of those counted errors actually looks like, worked through on the
   cell the reader has selected, rather than asserted in a sentence */
function ErrorExamples({ sit, code }: { sit: Sit; code: Code }) {
  const attrs = REALITY_ATTRS[key(sit, code)] ?? []
  const plain = VQA[key(sit, 'default')]?.closed ?? {}
  const rows = attrs
    .filter((a) => a.contradicts)
    .map((a) => {
      const pl = plain[a.q]
      const plainTop = pl?.[0]
      const total = pl?.reduce((x, y) => x + y.n, 0) ?? 0
      return {
        ...a,
        plain: plainTop?.v,
        plainShare: plainTop && total ? plainTop.n / total : 0,
        towardDefault: plainTop ? plainTop.v === a.gen : false,
      }
    })
    .filter((r) => r.plain)
    .sort((a, b) => Number(b.towardDefault) - Number(a.towardDefault))
    .slice(0, 4)

  if (!rows.length) return null
  return (
    <div className="mt-6 border-t border-border pt-5">
      <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
        what one of these disagreements looks like · “a {sit} in {C8[code].name}”
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/60">
        Read a row left to right: the photographs, then the country prompt, then the same prompt with the country taken
        out. When the country prompt's answer and the country-less answer are the <em>same word</em>, the model has
        departed from the photographs in the direction of the thing it already draws by default — that is the red count
        above. When it departs in some other direction, the prior is not what pulled it, so that row tells us nothing
        either way.
      </p>
      <div className="mt-4 space-y-1.5">
        {/* the same px-2 the bordered rows below carry, plus a border-coloured
            transparent edge: without them every value sat 8px right of its header */}
        {/* one skeleton, used by the header and every row: the verdict column was
            w-32, too narrow for its own heading, so both it and the values wrapped
            onto a second line. Wider verdict column, left-aligned question, and the
            same px-2 the bordered rows carry. */}
        <div className="flex items-center gap-4 border border-transparent px-2 pb-1 font-mono2 text-[9px] leading-4 tracking-wider text-foreground/50 uppercase">
          <span className="w-40 shrink-0">question</span>
          <span className="flex-1">the photographs say</span>
          <span className="flex-1">“a {sit} in {C8[code].name}” draws</span>
          <span className="flex-1">“a {sit}” with no country</span>
          <span className="w-44 shrink-0">which way does it lean?</span>
        </div>
        {rows.map((r) => (
          <div key={r.q} className="flex items-center gap-4 rounded-md border border-border px-2 py-2">
            <span className="w-40 shrink-0 truncate font-mono2 text-[10px] text-foreground/50" title={Q_TEXT[r.q] ?? r.q}>
              {Q_TEXT[r.q] ?? r.q}
            </span>
            <span className="flex-1 font-mono2 text-[11px] text-emerald-300">
              {r.real} <span className="text-foreground/35">{Math.round(r.real_share * 100)}%</span>
            </span>
            <span className="flex-1 font-mono2 text-[11px] text-red-300">
              {r.gen} <span className="text-foreground/35">{Math.round(r.gen_share * 100)}%</span>
            </span>
            <span className="flex-1 font-mono2 text-[11px] text-foreground/70">
              {r.plain} <span className="text-foreground/35">{Math.round(r.plainShare * 100)}%</span>
            </span>
            <span className={`w-44 shrink-0 font-mono2 text-[10px] leading-4 ${r.towardDefault ? 'text-red-300' : 'text-foreground/55'}`}>
              {r.towardDefault ? '→ toward its default' : '→ some other way'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Part5Reality() {
  const { model } = useModel()
  const [sit, setSit] = useState<Sit>('wedding')
  const [code, setCode] = useState<Code>('NG')
  const [showCredit, setShowCredit] = useState<number | null>(null)
  const cellKey = `${sit}_${SLUG[code]}`
  const photos = REAL_CREDITS[cellKey] ?? []
  const attrs = REALITY_ATTRS[key(sit, code)] ?? []
  const contradictions = attrs.filter((a) => a.contradicts)
  const hero = contradictions[0]
  const seeds = cell(sit, code).typical_order

  return (
    <SceneShell
      number="15"
      kicker="Part V · reality · findings 18–19"
      title={<>There are real photographs of these events, <em className="font-display italic text-red-300">and the model points the wrong way.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          Everything so far compares the model to itself. This part compares it to photographs. We measured{' '}
          {REAL_PHOTOS_N.toLocaleString()} real pictures of these events from Wikimedia Commons and put them through the
          identical blind questionnaire, so the same questions get answered about the model's world and about the world.
        </p>
      </Reveal>

      <Reveal delay={0.06}>
        <Panel className="mt-10">
          <div className="flex flex-wrap items-end gap-4">
            <BoxPicker label="event" value={sit} onChange={setSit} options={SIT_OPTS} size="sm" />
            <BoxPicker label="country" value={code} onChange={setCode} options={CODE_OPTS} size="sm" />
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <div className="font-mono2 text-[11px] text-red-300">
                generated · “a {sit} in {C8[code].name}” · {UI_MODEL_NAME[model]}
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {(isSd21(model) ? [seeds[0], seeds[12], seeds[25], seeds[40]] : modelSeeds(model, sit, code, 4)).map((s) => (
                  <ZoomImage
                    key={s}
                    src={modelImg(model, sit, code, s)}
                    alt={`generated ${sit} ${code} seed ${s}`}
                    caption={`generated · “a ${sit} in ${C8[code].name}” · ${UI_MODEL_NAME[model]} · seed ${s}`}
                    imgClassName="aspect-square w-full cursor-zoom-in rounded-md border border-border object-cover"
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="font-mono2 text-[11px] text-emerald-300">
                photographed · Commons pictures of {C8[code].name === 'United States' ? 'US' : C8[code].name} {sit}s
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1.5">
                {photos.slice(0, 4).map((p, i) => (
                  <button key={p.file} onClick={() => setShowCredit(showCredit === i ? null : i)} className="block">
                    <ZoomImage
                      src={realImg(p.file)}
                      alt={`real photo by ${p.author}`}
                      caption={`photograph · ${p.author} · ${p.license}`}
                      imgClassName="aspect-square w-full cursor-zoom-in rounded-md border border-border object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 min-h-[20px] font-mono2 text-[9px] leading-4 text-foreground/35">
            {showCredit !== null && photos[showCredit] ? (
              <span>
                photo: {photos[showCredit].author} · {photos[showCredit].license} ·{' '}
                <a href={photos[showCredit].url} target="_blank" rel="noreferrer" className="underline hover:text-foreground/60">Wikimedia Commons</a>
              </span>
            ) : (
              <span>real photos: Wikimedia Commons contributors · click one for its credit</span>
            )}
          </div>

          {/* the whole questionnaire, both worlds, side by side */}
          <div className="mt-8 border-t border-border pt-5">
            <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
              the same questions, asked about both · {contradictions.length} of {attrs.length} answers disagree
            </div>
            <div className="mt-5 overflow-hidden">
              <div className="flex items-end gap-1">
                {attrs.slice(0, 10).map((a) => (
                  <div key={a.q} className="flex min-w-0 flex-1 flex-col items-center">
                    <div className="flex h-40 w-full items-end justify-center gap-1">
                      <div className="flex h-full w-1/2 max-w-[34px] flex-col justify-end">
                        <span className="mb-1 text-center font-mono2 text-[10px] text-red-300">{Math.round(a.gen_share * 100)}</span>
                        <motion.div
                          className="w-full rounded-t bg-red-400/65"
                          initial={{ height: 0 }}
                          whileInView={{ height: `${a.gen_share * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6 }}
                          title={`the model draws “${a.gen}” on ${Math.round(a.gen_share * 100)}% of seeds`}
                        />
                      </div>
                      <div className="flex h-full w-1/2 max-w-[34px] flex-col justify-end">
                        <span className="mb-1 text-center font-mono2 text-[10px] text-emerald-300">{Math.round(a.real_share * 100)}</span>
                        <motion.div
                          className="w-full rounded-t bg-emerald-400/60"
                          initial={{ height: 0 }}
                          whileInView={{ height: `${a.real_share * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: 0.1 }}
                          title={`the photographs show “${a.real}” in ${Math.round(a.real_share * 100)}% of cases`}
                        />
                      </div>
                    </div>
                    {/* the two answers, stacked under their own bars */}
                    <div className="mt-1.5 w-full border-t border-border pt-1.5 text-center">
                      <div className="truncate font-mono2 text-[10px] text-red-300" title={a.gen}>{a.gen}</div>
                      <div className={`truncate font-mono2 text-[10px] ${a.contradicts ? 'text-emerald-300' : 'text-foreground/35'}`} title={a.real}>
                        {a.contradicts ? a.real : 'same'}
                      </div>
                      <div className="mt-1 truncate font-mono2 text-[9px] leading-3 text-foreground/40" title={Q_TEXT[a.q] ?? a.q}>
                        {Q_TEXT[a.q] ?? a.q}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-5 font-mono2 text-[10px] text-foreground/50">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-400/65" /> what the model draws, as a share of its 50 seeds</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400/60" /> what the photographs show, as a share of {attrs[0]?.n_real ?? 20}</span>
                <span className="text-foreground/35">both columns are percentages on the same 0–100 scale</span>
              </div>
            </div>
            {hero && (
              <p className="mt-5 max-w-3xl text-sm leading-6 text-foreground/70">
                The sharpest disagreement here: asked <em>{Q_TEXT[hero.q] ?? hero.q}</em>, the model answers{' '}
                <strong className="text-red-300">“{hero.gen}”</strong> on {Math.round(hero.gen_share * 100)}% of its
                seeds, while {Math.round(hero.real_share * 100)}% of the photographs answer{' '}
                <strong className="text-emerald-300">“{hero.real}”</strong>. The model did not learn{' '}
                {C8[code].name === 'United States' ? 'American' : `${C8[code].name}n`} {sit}s. It learned a postcard of
                them.
              </p>
            )}
          </div>

          <div className="mt-5 border-t border-border pt-5">
            <TierNote
              tier="evidence"
              text={`Generated side: 50 seeds per cell, two independent annotators. Real side: ${REAL_PHOTOS_N.toLocaleString()} Commons photographs across ${REAL_CELLS_N} cells, put through the same frozen questionnaire, about ${REAL_PER_CELL} photographs per cell (collected from ~4,700 candidates, then relevance-filtered). One caveat we can measure and do not hide: a few Commons categories are dominated by a single prolific photographer, which narrows those cells; it does not flip the direction of any comparison above.`}
            />
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-6">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            the model is narrower than the world · “a {sit}” · {UI_MODEL_NAME[model]} against photographs
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/60">
            Each line is one country. The hollow dot is how alike real photographs of that event are to each other; the
            filled dot is how alike the model's 50 pictures are. For every country the filled dot sits to the right.
            Real weddings vary more than generated ones, everywhere. The narrowing belongs to the model, not to the
            world it is depicting.
          </p>
          <div className="mt-6">
            <HomogeneityDumbbells sit={sit} />
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <TierNote tier="evidence" text="Mean pairwise similarity within each set, with bootstrap confidence intervals." />
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel className="mt-6">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            finding 19 · when the model and the photographs disagree, which way does it lean?
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/60">
            Three answers exist for every question here: what the <strong>photographs</strong> show, what the model draws
            for <strong>“a wedding in Nigeria”</strong>, and what the same model draws for <strong>“a wedding”</strong>{' '}
            with no country in it — its own default. Whenever the country prompt disagrees with the photographs, that
            disagreement has a direction: either toward the photographs, or toward the model's own default answer. We
            classified every disagreeing question in every cell, in all seven models. Each bar below is one model's own
            split as a percentage, and the figure on the right is how many disagreements it had in total. Note what this
            is and is not: a disagreement with a photograph set is not by itself an error — a generated picture is not
            obliged to match a Commons category — so this is read as a <em>tendency</em>, never as a failure count.
          </p>
          <div className="mt-6">
            <DistortionBars />
          </div>
          <ErrorExamples sit={sit} code={code} />
          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg border border-red-400/25 bg-red-400/5 p-4">
            <span className="font-mono2 text-3xl text-red-300">{DISTORTION.pooled.ratio}×</span>
            <p className="max-w-xl text-sm leading-6 text-foreground/70">
              Pooled over all seven models: <strong>{DISTORTION.pooled.toward_default}</strong> disagreements lean
              toward the model's own default world against <strong>{DISTORTION.pooled.toward_reality}</strong> that
              lean toward the photographs. The departures are not scattered evenly in every direction. They have a home
              to fall back towards.
            </p>
          </div>
          <p className="mt-3 max-w-3xl font-mono2 text-[10px] leading-4 text-foreground/50">
            Where that pooled figure comes from matters: Stable Diffusion 2.1's own split is close to even (
            {DISTORTION.sd21.toward_default} against {DISTORTION.sd21.toward_reality}, and none of its{' '}
            {DISTORTION.sd21.n_questions_tested} tested questions is individually significant). The lean is carried by
            the six newer models, each of which sits well above an even split on its own row.
          </p>
          <div className="mt-5 border-t border-border pt-5">
            <TierNote
              tier="evidence"
              text={`Direction assigned per question by permutation test, 10,000 shuffles. On Stable Diffusion 2.1, ${DISTORTION.sd21.n_significant_p05} of ${DISTORTION.sd21.n_questions_tested} questions reach significance on their own, so this is reported only as a pooled tendency and never attribute by attribute. ${DISTORTION.caveat}`}
            />
          </div>
        </Panel>
      </Reveal>
    </SceneShell>
  )
}
