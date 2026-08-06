import { SceneShell, Reveal, Panel } from '../components/Scene'
import { CountUp } from '../components/CountUp'
import { STATS } from '../data/research'
import { REAL_PHOTOS_N, REAL_QUESTIONNAIRE_N } from '../data/part5'
import { CARDS_HEADLINE, CARDS_TOTAL } from '../data/part4'
import { REFERENCES, WEIGHTS, AUTHOR } from '../data/references'

const STAT_CELLS = [
  { v: STATS.images, label: 'generated images analyzed' },
  { v: STATS.prompts, label: 'frozen prompts · 6 situations × 9 variants' },
  { v: STATS.seeds, label: 'seeds per prompt, fixed across all variants' },
  { v: 7, label: 'models audited · 5 developers, 2 architecture families' },
  { v: 36, label: 'of 36 model×situation cells replicate the Western default' },
  { v: CARDS_HEADLINE, label: `verified headline named assumptions (${CARDS_TOTAL} total)` },
]

/* One condition of the instrument check: how the annotator's answer moved (or did
   not) when the prompt gained a clause and nothing else changed. */
export default function Closing() {
  return (
    <>
      <SceneShell
        number="M"
        kicker="ending notes"
        title={<>How every number on this page <em className="font-display italic text-amber-200">was obtained.</em></>}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <Panel className="h-full">
              <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">the measurements</div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-foreground/70">
                <p>
                  <strong className="text-foreground">Nothing rests on one picture.</strong> Every claim is a
                  50-seed statistic with a bootstrap confidence interval. Where a single image appears, it is there to
                  show you what the statistic is about, never to carry it.
                </p>
                <p>
                  <strong className="text-foreground">Nothing rests on one measuring stick.</strong> Distances were
                  re-measured with CLIP as well as DINOv3, and you can switch between them on the charts themselves.
                  The reported gaps clear {STATS.permutation}: we shuffled the labels ten thousand times and no
                  shuffle reproduced them.
                </p>
                <p>
                  <strong className="text-foreground">Nothing rests on a single strong-looking gap.</strong>{' '}
                  {STATS.knn}, and {STATS.splitHalf}: the first 25 seeds and the last 25 give the same answer, so 50
                  is enough.
                </p>
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={0.1}>
            <Panel className="h-full">
              <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">the reality anchor</div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-foreground/70">
                <p>
                  Every comparison up to Part V is the model against itself. Part V is the model against photographs:
                  <strong className="text-foreground">{REAL_PHOTOS_N.toLocaleString()} reference photographs</strong> from Wikimedia Commons,
                  put through the same metrics as the generated ones, and{' '}
                  <strong className="text-foreground">{REAL_QUESTIONNAIRE_N.toLocaleString()}</strong> of them through
                  the same blind questionnaire.
                </p>
                <p>
                  It places the default prompt closest to real US weddings and farthest from real Indian ones, and it
                  finds the generated sets narrower than the real ones for <em>every</em> country. That second result
                  is the one that rules out the charitable reading, namely that the model is merely reflecting a world
                  which is itself repetitive.
                </p>
                <p className="text-foreground/55">
                  The known limit, stated where it applies: a few Commons categories are dominated by one prolific
                  photographer, which narrows those cells. It does not flip the direction of any comparison shown.
                </p>
              </div>
            </Panel>
          </Reveal>
        </div>
      </SceneShell>

      <SceneShell number="∴" kicker="Closing" title={<>Every image is a negotiation.</>}>
        <Reveal>
          <p className="prose-scene max-w-2xl">
            Between what was requested and what the model already believes. This page has now shown the same wall from
            four directions: guidance cannot reach the prior, clauses relocate assumptions rather than remove them,
            even the grammar of a fix changes which prior you get, and the strongest prompt-free move available —
            keeping only the most different of fifty images — buys back about a sixth of the distance to real
            photographs and never more.
          </p>
          <p className="prose-scene mt-4 max-w-2xl">
            Which points at one conclusion rather than a list of tips.{' '}
            <strong className="text-foreground/90">The prompt is the wrong control surface.</strong> It is the layer a
            user has, and it is not the layer the assumption lives on.
          </p>
          <p className="prose-scene mt-4 max-w-2xl">
            Two things follow that are worth a reader's time. The first is available today and this page is a
            demonstration of it: <strong>sample the distribution, not the sample</strong> — generate many seeds, ask
            what never varies across them, and treat the first third of denoising as the moment the decision is
            actually made. That is what the Auditor above automates. The second is not at the interface at all —
            fine-tuning, retrieval augmentation, dataset curation, post-hoc diversity sampling. Those are cited here,
            not tested, and deliberately out of scope: this study measures what a prompt can and cannot do, and the
            honest end of that measurement is knowing where its edge is.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
            {STAT_CELLS.map((s) => (
              <div key={s.label} className="bg-card p-6">
                <div className="font-mono2 text-3xl text-amber-200">
                  <CountUp to={s.v} />
                </div>
                <div className="mt-2 font-mono2 text-[11px] leading-4 text-foreground/50">{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </SceneShell>

      <SceneShell number="§" kicker="Sources" title={<>What this stands on.</>}>
        <Reveal>
          <p className="prose-scene max-w-2xl">
            Everything above is measured, but almost nothing above is new on its own. The country-qualifier method,
            the mid-generation swap, the diversity score, the agreement statistic and the training-set filter are all
            borrowed, and the trailing clause on each entry says what it is doing here. Where this page departs from
            its sources is stated in the entry, not left for you to infer.
          </p>
        </Reveal>
        <Reveal delay={0.06}>
          <ol className="mt-8 max-w-3xl space-y-3.5">
            {REFERENCES.map((r, i) => (
              <li key={r.id} className="grid grid-cols-[1.75rem_1fr] gap-2 text-sm leading-6">
                <span className="pt-0.5 font-mono2 text-[11px] text-foreground/30">[{i + 1}]</span>
                <span className="text-foreground/70">
                  {r.authors} ({r.year}).{' '}
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground/90 underline decoration-border underline-offset-2 hover:decoration-amber-200"
                  >
                    {r.title}
                  </a>
                  . <span className="text-foreground/45 italic">{r.venue}.</span>
                  <span className="mt-0.5 block font-mono2 text-[10px] leading-4 text-foreground/40">{r.role}</span>
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
        <Reveal delay={0.1}>
          <Panel className="mt-10">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">credits</div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-foreground/65">
              <p>
                The {REAL_PHOTOS_N.toLocaleString()} reference photographs in Part V are the work of Wikimedia Commons
                photographers, reused under their individual licences — each photograph carries its author and licence
                inline in that scene.
              </p>
              <p>Model weights, all run locally:</p>
              <ul className="space-y-2">
                {WEIGHTS.map((g) => (
                  <li key={g.group} className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <span className="font-mono2 w-56 shrink-0 text-[10px] tracking-wider text-foreground/40 uppercase sm:pt-1">
                      {g.group}
                    </span>
                    <span className="text-[13px] leading-6">
                      {g.models.map((m, i) => (
                        <span key={m.label}>
                          {i > 0 && ' · '}
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noreferrer"
                            className="underline decoration-border underline-offset-2 hover:decoration-amber-200"
                          >
                            {m.label}
                          </a>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
              <p>Interface built with shadcn/ui, Radix primitives and Google Fonts.</p>
            </div>
          </Panel>
        </Reveal>
      </SceneShell>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div className="font-mono2 text-[11px] leading-5 text-foreground/40">
            <span className="text-foreground/70">promptswontsaveyou.dev</span> · an interactive XAI explorable by{' '}
            <span className="text-foreground/70">{AUTHOR.name}</span>
            {AUTHOR.affiliation && `, ${AUTHOR.affiliation}`} ·{' '}
            <a href={`mailto:${AUTHOR.email}`} className="underline decoration-border underline-offset-2">
              {AUTHOR.email}
            </a>{' '}
            · {AUTHOR.date}
            <br />
            Stable Diffusion 2.1 · DDIM 30 steps · 768² · DINOv3-7B embeddings · VQA annotator: gemma4.
          </div>
          <div className="font-mono2 text-[11px] text-foreground/30">
            XAI × HCI · thesis explorable · cultural assumptions scope
          </div>
        </div>
      </footer>
    </>
  )
}
