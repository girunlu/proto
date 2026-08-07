import { SceneShell, Reveal, Panel } from '../components/Scene'
import { CountUp } from '../components/CountUp'
import { STATS } from '../data/research'
import { CARDS_HEADLINE, CARDS_TOTAL } from '../data/part4'
import { REFERENCES, WEIGHTS, AUTHORS, PUB_DATE } from '../data/references'

const STAT_CELLS = [
  { v: STATS.images, label: 'generated images analyzed · a conservative floor' },
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
        <div className="grid gap-6">
          <Reveal>
            <Panel className="h-full">
              <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">the measurements</div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-foreground/70">
                <p>
                  <strong className="text-foreground">Nothing rests on one picture.</strong> Every claim is a
                  50-seed statistic with a bootstrap confidence interval; single images illustrate a statistic, they
                  never carry one.
                </p>
                <p>
                  <strong className="text-foreground">Nothing rests on one measuring stick.</strong> Distances were
                  re-measured with CLIP as well as DINOv3. The reported gaps clear {STATS.permutation}: we shuffled
                  the labels ten thousand times and no shuffle reproduced them.
                </p>
                <p>
                  <strong className="text-foreground">Nothing rests on a single strong-looking gap.</strong>{' '}
                  {STATS.knn}, and {STATS.splitHalf}: the first 25 seeds and the last 25 give the same answer, so 50
                  is enough.
                </p>
              </div>
            </Panel>
          </Reveal>

          {/* the reality anchor panel — REMOVED 2026-08-06 with the dismissal of Part V:
              every claim in it rested on the reference-photograph set that was judged
              not reliable enough to anchor a comparison. */}
        </div>
      </SceneShell>

      <SceneShell number="∴" kicker="Closing" title={<>Every image is a negotiation.</>}>
        <Reveal>
          <p className="prose-scene max-w-2xl">
            Between what was requested and what the model already believes. The same wall, seen from three directions:
            guidance cannot reach the prior, clauses relocate assumptions rather than remove them, and the grammar of a
            fix changes which prior you get.
            {/* the fourth direction — the seed-selection move that "buys back about a sixth
                of the distance to real photographs" — was cut 2026-08-06: its yardstick was
                the dismissed Part V reference set. */}
          </p>
          <p className="prose-scene mt-4 max-w-2xl">
            Which points at one conclusion rather than a list of tips.{' '}
            <strong className="text-foreground/90">The prompt is the wrong control surface.</strong> It is the layer a
            user has, and it is not the layer the assumption lives on.
          </p>
          <p className="prose-scene mt-4 max-w-2xl">
            Two things follow. The first is available today: <strong>sample the distribution, not the sample</strong>:
            generate many seeds, ask what never varies across them, and treat the first third of denoising as the
            moment the decision is actually made; the Auditor above automates this. The second is not at the interface
            at all (fine-tuning, retrieval augmentation, dataset curation, post-hoc diversity sampling), cited here,
            not tested, deliberately out of scope.
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
            Everything above is measured; almost nothing above is new on its own.
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
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
        <Reveal delay={0.1}>
          <Panel className="mt-10">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">credits</div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-foreground/65">
              {/* the Wikimedia Commons photo credits — REMOVED 2026-08-06 with the
                  dismissal of Part V; the photographs no longer appear on the page,
                  so no attribution is owed here. Restore with the scene. */}
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
            <span className="text-foreground/70">promptswontsaveyou.dev</span> · an interactive XAI explorable · {PUB_DATE}
            <br />
            {AUTHORS.map((a) => (
              <span key={a.name} className="block">
                <a href={`mailto:${a.email}`} className="text-foreground/70 underline decoration-border underline-offset-2">
                  {a.name}
                </a>
                <span className="text-foreground/35"> · {a.affiliation}</span>
              </span>
            ))}
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
