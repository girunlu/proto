// ─────────────────────────────────────────────────────────────────────────────
// The orientation screen, between the hero and Part I. Readers were being dropped
// straight into scene 01 with no idea what had been done or how far the page runs,
// so this states the method in one paragraph and then lays the argument out as
// seven moves you can jump into. Everything here is derived from the data layer —
// no separately typed counts that could drift from the scenes below.
// ─────────────────────────────────────────────────────────────────────────────
import { SceneShell, Reveal } from '../components/Scene'
import { STATS } from '../data/research'
import { CARDS_HEADLINE } from '../data/part4'
import { MODELS } from '../data/modelData'
import { Q_TEXT } from '../data/uiv2'

const N_QUESTIONS = Object.keys(Q_TEXT).length

const MOVES: { id: string; part: string; claim: string; how: string }[] = [
  {
    id: 'p1',
    part: 'I · the default',
    claim: 'A default prompt already has a nationality.',
    how: 'distance from “a wedding” to “a wedding in …”, measured seed by seed and mapped',
  },
  {
    id: 'p4',
    part: 'II · the assumptions, named',
    claim: 'The narrowing is nameable, attribute by attribute.',
    how: `every image shown to a vision-language model that never sees the prompt, ${N_QUESTIONS} frozen questions`,
  },
  {
    id: 'p2',
    part: 'III · the mechanism',
    claim: 'That choice is made in the first third of generation.',
    how: 'generation interrupted and the prompt swapped mid-flight',
  },
  {
    id: 'p3',
    part: 'IV · the escape',
    claim: 'You can flip an attribute. You cannot buy the distribution back.',
    how: 'the guidance dial pushed to both its limits, then the named assumptions counter-specified one clause at a time',
  },
  // The cross-model part and "what a clause can move" both live in the extras
  // section at the end of the page (#p6), off the main line of the argument —
  // across-models moved there 2026-08-10.
  // V · the outside reference — dismissed 2026-08-06: the reference-photograph set is
  // not reliable enough to anchor a comparison. The scene is unmounted in Home.tsx
  // and its anchor (#p5) no longer exists; the section file stays in src/sections/.
]

/* Spelled from the list rather than typed: the count has been wrong twice now,
   once when a part was dismissed and once when one moved into the extras. */
const MOVE_COUNT = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][MOVES.length]

export default function Overview() {
  return (
    <SceneShell
      number="·"
      kicker="before you start"
      title={<>One argument, <em className="font-display italic text-amber-200">{MOVE_COUNT} moves.</em></>}
    >
      <Reveal>
        <p className="prose-scene max-w-2xl">
          Everything on this page comes from one frozen experiment: six everyday situations (a wedding, a funeral, a
          celebration, a family, a breakfast, a school), each written nine ways, once plainly and once for each of
          eight countries. That is <strong>{STATS.prompts} prompts</strong>, generated{' '}
          <strong>{STATS.seeds} times each on the same fixed seeds</strong>, in <strong>{MODELS.length} models</strong>
          , for <strong>more than {STATS.images.toLocaleString()} images</strong> in total.
        </p>
      </Reveal>

      {/* The base every scene builds on, stated once. Each scene's own setup block
          carries only what that scene adds to this — restating the grid thirteen
          times is exactly the drowning we are trying to avoid. */}

      {/* The "how the argument runs · jump in anywhere" list is DISMISSED
          2026-08-10 (Giray): the part structure it indexes is being replaced
          (intro / underspecified alignment / alignment source / semantic
          assumptions / assumption stabilization / conclusion), so an index of the
          old one would only go stale. Unmounted, not deleted, the block is in
          scratchpad/overview_jumplist.tsx and MOVES still drives the title's
          count. */}

      <Reveal delay={0.1}>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">it is interactive</div>
            <p className="mt-2 text-[13px] leading-5 text-foreground/65">
              The control at the top of the screen switches which of the {MODELS.length} models you are looking at.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
              nothing rests on one picture
            </div>
            <p className="mt-2 text-[13px] leading-5 text-foreground/65">
              A single image shows what a statistic is about, never carries it. The headline gaps survive relabelling
              the images ten thousand times.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="font-mono2 text-[10px] tracking-wider text-foreground/40 uppercase">
              the limits are on the page
            </div>
            <p className="mt-2 text-[13px] leading-5 text-foreground/65">
              {CARDS_HEADLINE} assumptions are named here; where the instrument is blind to its own subject, the scene
              says so in place.
            </p>
          </div>
        </div>
      </Reveal>
    </SceneShell>
  )
}
