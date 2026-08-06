import { useState } from 'react'
import { motion } from 'framer-motion'
import { SceneShell, Reveal, Panel, TierNote } from '../components/Scene'
import { ZoomImage, BoxPicker } from '../components/Viz'
import { rgb, rgba } from '../lib/colors'
import { C8, COUNTRY8, SITS, DEMONYM, cell, type Sit, type Code } from '../data/part1'
import { REALITY_ANCHOR, REAL_PHOTOS_N, REAL_QUESTIONNAIRE_N, REAL_CELLS_N, REAL_PER_CELL } from '../data/part5'
import { REALITY_ATTRS, REAL_CREDITS, realImg, key, Q_TEXT } from '../data/uiv2'
import { useModel, modelImg, modelSeeds, MODEL_NAME as UI_MODEL_NAME, isSd21 } from '../data/modelData'
import { realityFor } from '../data/crossmodel'

const SIT_OPTS = SITS.map((s) => ({ value: s, label: `a ${s}` }))
const CODE_OPTS = COUNTRY8.map((c) => ({ value: c.id, label: c.name, cv: c.cv }))
const SLUG: Record<Code, string> = {
  US: 'united_states', DE: 'germany', RU: 'russia', ID: 'indonesia',
  JP: 'japan', EG: 'egypt', IN: 'india', NG: 'nigeria',
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

  /* The old title — "and the model points the wrong way" — was finding 19's verdict,
     and finding 19 was removed 2026-08-06. What is left is a comparison with no
     correct side: the photographs vary more, and the two sets answer the questionnaire
     differently. Emerald because the subject of the claim is now the photographs,
     matching the "photographed" label below. */
  return (
    <SceneShell
      number="12"
      kicker="Part V · an outside reference · finding 18"
      title={<>There are real photographs of these events, <em className="font-display italic text-emerald-300">and they vary more than the model does.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          Everything so far compares the model to itself. This part compares it to photographs. We measured{' '}
          {REAL_PHOTOS_N.toLocaleString()} real pictures of these events from Wikimedia Commons geometrically, and put{' '}
          {REAL_QUESTIONNAIRE_N.toLocaleString()} of them through the identical blind questionnaire — the full
          collected set, after an earlier 20-per-cell cap was lifted on 2026-08-02 — so the same questions get
          answered about the model's world and about the world.
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

          {/* the whole questionnaire, both worlds, side by side.
              R3: this chart reads REALITY_ATTRS/VQA, which are SD 2.1 only, while the
              images above follow the switcher. Labelling it honestly rather than
              printing the selected model's name over Stable Diffusion's numbers. */}
          <div className="mt-8 border-t border-border pt-5">
            <div className="font-mono2 text-[10px] tracking-widest text-foreground/40 uppercase">
              the same questions, asked about both · {contradictions.length} of {attrs.length} answers disagree
            </div>
            {!isSd21(model) && (
              <p className="mt-2 font-mono2 text-[10px] leading-4 text-amber-200/90">
                The pictures above follow your model selection; this questionnaire comparison is Stable Diffusion 2.1's
                only — the blind battery was run against the photographs for SD 2.1, and the cross-model reality tables
                cover the geometry rather than these per-answer base rates.
              </p>
            )}
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
                          title={`the model generates “${a.gen}” on ${Math.round(a.gen_share * 100)}% of seeds`}
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
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-400/65" /> what the model generates, as a share of its 50 seeds</span>
                {/* rows in the same chart can have different n_real (14-20), so the
                    legend has to name the range it actually covers, not row 0's */}
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400/60" /> what the photographs show, as a share of {(() => {
                  const ns = attrs.map((a) => a.n_real).filter(Boolean)
                  const lo = Math.min(...ns), hi = Math.max(...ns)
                  return ns.length === 0 ? 20 : lo === hi ? lo : `${lo}–${hi}`
                })()}</span>
                <span className="text-foreground/35">both columns are percentages on the same 0–100 scale</span>
              </div>
            </div>
            {hero && (
              <p className="mt-5 max-w-3xl text-sm leading-6 text-foreground/70">
                The sharpest disagreement here: asked <em>{Q_TEXT[hero.q] ?? hero.q}</em>, the model answers{' '}
                <strong className="text-red-300">“{hero.gen}”</strong> on {Math.round(hero.gen_share * 100)}% of its
                seeds, while {Math.round(hero.real_share * 100)}% of the photographs answer{' '}
                <strong className="text-emerald-300">“{hero.real}”</strong>. The model did not learn{' '}
                {DEMONYM[code]} {sit}s. It learned a postcard of
                them.
              </p>
            )}
          </div>

          <div className="mt-5 border-t border-border pt-5">
            <TierNote
              tier="evidence"
              text={`Generated side: 50 seeds per cell. Both sides are read by the same annotator (gemma4) — a comparison scored by two different readers would be measuring the readers. Real side: ${REAL_PHOTOS_N.toLocaleString()} Commons photographs across ${REAL_CELLS_N} cells (about ${REAL_PER_CELL} per cell, collected from ~4,700 candidates then relevance-filtered) carry the geometry — distances and homogeneity. The frozen questionnaire ran on ${REAL_QUESTIONNAIRE_N.toLocaleString()} of them — the full collected set since 2026-08-02, when an earlier 20-per-cell cap was lifted; the larger n did not move any of the 31 per-question tests to significance, which makes the pooled tendency below the honest headline. One caveat we can measure and do not hide: a few Commons categories are dominated by a single prolific photographer, which narrows those cells; it does not flip the direction of any comparison above.`}
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

      {/* finding 19 — "when the model and the photographs disagree, which way does
          it lean?" — REMOVED 2026-08-06, with its DistortionBars and ErrorExamples
          panels. distortion_summary.json and part5.ts's DISTORTION export are
          untouched; nothing renders them now. Recover from git if wanted. */}
    </SceneShell>
  )
}
