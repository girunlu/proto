// ─────────────────────────────────────────────────────────────────────────────
// The orientation screen, between the hero and Part I. Readers were being dropped
// straight into scene 01 with no idea what had been done or how far the page runs,
// so this states the method in one paragraph and then lays the argument out as
// seven moves you can jump into. Everything here is derived from the data layer —
// no separately typed counts that could drift from the scenes below.
// ─────────────────────────────────────────────────────────────────────────────
import { SceneShell, Reveal, Panel } from '../components/Scene'
import { STATS } from '../data/research'
import { CARDS_HEADLINE } from '../data/part4'
import { REAL_PHOTOS_N } from '../data/part5'
import { MODELS } from '../data/modelData'
import { Q_TEXT } from '../data/uiv2'

const N_QUESTIONS = Object.keys(Q_TEXT).length

const MOVES: { id: string; part: string; claim: string; how: string }[] = [
  {
    id: 'p1',
    part: 'I · the default',
    claim: 'An unqualified prompt already has a nationality.',
    how: 'distance from “a wedding” to “a wedding in …”, seed by seed, plus what the model draws for no prompt at all',
  },
  {
    id: 'p2',
    part: 'II · the mechanism',
    claim: 'That choice is made in the first third of drawing, and guidance cannot reach it.',
    how: 'generation interrupted and the prompt swapped mid-flight; the guidance slider swept 1 → 15',
  },
  {
    id: 'p3',
    part: 'III · the override',
    claim: 'Naming a country does not enrich the output. It narrows it.',
    how: 'variety inside each set, against matched neutral qualifiers of the same length',
  },
  {
    id: 'p4',
    part: 'IV · the assumptions, named',
    claim: 'The narrowing is nameable, attribute by attribute.',
    how: `every image shown to a vision-language model that never sees the prompt, ${N_QUESTIONS} frozen questions`,
  },
  {
    id: 'p5',
    part: 'V · reality',
    claim: 'Where the model contradicts photographs, it errs toward its own default.',
    how: `${REAL_PHOTOS_N.toLocaleString()} Wikimedia Commons photographs of the same events, same questionnaire`,
  },
  {
    id: 'p6',
    part: 'VI · the escape and its price',
    claim: 'You can flip an attribute. You cannot buy the distribution back.',
    how: 'counter-specifying the named assumptions one clause at a time, then measuring what returns',
  },
  {
    id: 'xa',
    part: 'VII · is it just this model?',
    claim: 'No. The default replicates in every model tested.',
    how: `the identical frozen instrument re-run on ${MODELS.length - 1} more models`,
  },
]

export default function Overview() {
  return (
    <SceneShell
      number="—"
      kicker="before you start"
      title={<>One argument, <em className="font-display italic text-amber-200">seven moves.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          Everything on this page comes from one frozen experiment. Six everyday situations — a wedding, a funeral, a
          celebration, a family, a breakfast, a school — were each written nine ways: once plainly, then once for each
          of eight countries. That is <strong>{STATS.prompts} prompts</strong>, generated{' '}
          <strong>{STATS.seeds} times each on the same fixed seeds</strong>, in <strong>{MODELS.length} models</strong>,
          for <strong>{STATS.images.toLocaleString()} images</strong> in total. Nothing was hand-picked: the prompts
          were fixed before the first image was made and never edited, and every claim below is a statistic over a
          whole set of seeds rather than an example someone chose.
        </p>
      </Reveal>

      <Reveal delay={0.06}>
        <Panel className="mt-10">
          <div className="font-mono2 text-xs tracking-widest text-foreground/40 uppercase">
            how the argument runs · jump in anywhere
          </div>
          <ol className="mt-5">
            {MOVES.map((m, i) => (
              <li key={m.id}>
                <a
                  href={`#${m.id}`}
                  className="group flex flex-col gap-1 border-t border-border py-3.5 transition first:border-t-0 hover:bg-foreground/[0.03] sm:flex-row sm:items-baseline sm:gap-5"
                >
                  <span className="font-mono2 w-44 shrink-0 text-[11px] tracking-wider text-amber-200/70 uppercase">
                    {m.part}
                  </span>
                  <span className="flex-1">
                    <span className="block text-[15px] leading-6 text-foreground/85 group-hover:text-foreground">
                      {m.claim}
                    </span>
                    <span className="mt-0.5 block font-mono2 text-[10px] leading-4 text-foreground/45">{m.how}</span>
                  </span>
                  <span className="font-mono2 shrink-0 text-[11px] text-foreground/25 transition group-hover:text-amber-200">
                    {String(i + 1).padStart(2, '0')} →
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </Panel>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">it is interactive</div>
            <p className="mt-2 text-[13px] leading-5 text-foreground/65">
              Charts respond to hover, every thumbnail enlarges, and the control at the top of the screen switches
              which of the {MODELS.length} models you are looking at. Scenes that were only measured on one model say
              so where they sit.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
              nothing rests on one picture
            </div>
            <p className="mt-2 text-[13px] leading-5 text-foreground/65">
              Where a single image appears it is there to show you what a statistic is about, never to carry it. Bars
              carry confidence intervals; the headline gaps survive relabelling the images ten thousand times.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
              the limits are on the page
            </div>
            <p className="mt-2 text-[13px] leading-5 text-foreground/65">
              {CARDS_HEADLINE} assumptions are named here, and the places where the instrument is blind to its own
              subject are marked in the scene where they apply rather than confessed at the end.
            </p>
          </div>
        </div>
      </Reveal>
    </SceneShell>
  )
}
