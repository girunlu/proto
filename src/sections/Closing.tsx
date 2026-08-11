import { SceneShell, Reveal } from '../components/Scene'
import { REFERENCES, WEIGHTS, PUB_DATE } from '../data/references'

/* STAT_CELLS fed the dismissed finale's stat grid. Parked here rather than
   deleted, alongside the scene itself:
const STAT_CELLS = [
  { v: STATS.images, label: 'generated images analyzed · a conservative floor' },
  { v: STATS.prompts, label: 'frozen prompts · 6 situations × 9 variants' },
  { v: STATS.seeds, label: 'seeds per prompt, fixed across all variants' },
  { v: 7, label: 'models audited · 5 developers, 2 architecture families' },
  { v: 36, label: 'of 36 model×situation cells replicate the Western default' },
  { v: CARDS_HEADLINE, label: `verified headline named assumptions (${CARDS_TOTAL} total)` },
]
*/

/* One condition of the instrument check: how the annotator's answer moved (or did
   not) when the prompt gained a clause and nothing else changed. */
export default function Closing() {
  return (
    <>
      {/* Scene M ("ending notes: how every number was obtained") and the closing
          scene ∴ ("Every image is a negotiation") are DISMISSED 2026-08-10 (Giray),
          ahead of a rewrite: the closing is being replaced by a conclusion /
          references / acknowledgement structure rather than this finale + stat grid.
          STAT_CELLS above still compiles and feeds nothing. */}

      {/* Acknowledgements, Giray's text 2026-08-10, moved above the references and
          retitled on 2026-08-11 at Giray's request: the section is called what it is
          rather than "With thanks." Its kicker is dropped because the title now
          carries the same word. */}
      <div id="ack">
        <SceneShell number="†" title={<>Acknowledgements</>} lead>
          <Reveal>
            <p className="prose-scene max-w-2xl">
              This work was supported by the Austrian Science Fund (FWF DFH 23–N) and the Austrian Research Promotion
              Agency (FFG 911655: “Pro<sup>2</sup>Future”).
            </p>
          </Reveal>
        </SceneShell>
      </div>

      {/* `closing` sits on this scene rather than on the wrapper in Home.tsx: the
          NavRail's last stop is labelled "references", and with acknowledgements
          now first, a wrapper-level anchor would have landed the reader a section
          short of it. */}
      <SceneShell number="§" title={<>References</>} id="closing" lead>
        <Reveal>
          <p className="prose-scene max-w-2xl">
            Everything above is measured; almost nothing above is new on its own.
          </p>
        </Reveal>
        <Reveal delay={0.06}>
          <ol className="mt-8 max-w-3xl space-y-3.5">
            {REFERENCES.map((r, i) => (
              <li id={`ref-${r.id}`} className="grid scroll-mt-28 grid-cols-[1.75rem_1fr] gap-2 text-sm leading-6" key={r.id}>
                <span className="pt-0.5 font-mono2 text-[11px] text-foreground/30">[{i + 1}]</span>
                <span className="text-foreground/70">
                  {r.authors} ({r.year}).{' '}
                  {r.url ? (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-foreground/90 underline decoration-border underline-offset-2 hover:decoration-amber-200"
                    >
                      {r.title}
                    </a>
                  ) : (
                    <span className="text-foreground/90">{r.title}</span>
                  )}
                  . <span className="text-foreground/45 italic">{r.venue}.</span>
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
        {/* The model weights, restored 2026-08-10 (Giray) under the references: every
            Hugging Face repo the study actually loaded, grouped by the role it plays.
            The interface-libraries line that used to sit here stays out; it belongs
            in the acknowledgements. */}
        <Reveal delay={0.1}>
          <div className="mt-12 border-t border-border pt-6">
            <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
              model weights, all run locally
            </div>
            <ul className="mt-4 space-y-2.5">
              {WEIGHTS.map((g) => (
                <li key={g.group} className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                  <span className="font-mono2 w-56 shrink-0 text-[10px] leading-6 tracking-wider text-foreground/40 uppercase">
                    {g.group}
                  </span>
                  <span className="text-[13px] leading-6 text-foreground/70">
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
          </div>
        </Reveal>
      </SceneShell>

      {/* Trimmed 2026-08-10 (Giray) to the domain and the keywords. The five-author
          list with affiliations was the third printing of the same names (the hero's
          authors block is the first, the acknowledgements sit right above), and the
          run specification it also carried is deliberately not restated anywhere: the
          per-model settings differ (each generator runs at its own documented guidance)
          and no single line is true of all seven, so the weights list twenty lines up
          names the exact repos instead. */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div className="font-mono2 text-[11px] leading-5 text-foreground/40">
            <span className="text-foreground/70">promptswontsaveyou.dev</span> · an interactive XAI explorable · {PUB_DATE}
          </div>
          <div className="font-mono2 text-[11px] text-foreground/30">
            XAI × HCI · thesis explorable · cultural assumptions scope
          </div>
        </div>
      </footer>
    </>
  )
}
