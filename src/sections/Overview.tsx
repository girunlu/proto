// ─────────────────────────────────────────────────────────────────────────────
// The orientation screen, between the hero and Part I. Readers were being dropped
// straight into scene 01 with no idea what had been done or how far the page runs,
// so this states the method in one paragraph and then lays the argument out as
// seven moves you can jump into. Everything here is derived from the data layer —
// no separately typed counts that could drift from the scenes below.
// ─────────────────────────────────────────────────────────────────────────────
import { SceneShell, Reveal } from '../components/Scene'
import { Setup } from '../components/Viz'
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
      <Reveal delay={0.04}>
        <div className="mt-8 max-w-3xl">
          <Setup
            rows={[
              { k: 'the grid', v: `Six everyday events × (plainly + eight countries) = ${STATS.prompts} prompts, each generated ${STATS.seeds} times on the same fixed seeds. Nothing differs between two cells but the words.` },
              { k: 'how they were made', v: 'SD 2.1 is the baseline: DDIM, 30 steps, 768×768, guidance 7.5. The other six models run the identical grid at their own documented guidance.' },
              { k: 'the two rulers', v: 'DINOv3-7B cosine distance throughout, with CLIP as an independent second ruler on every chart that carries a toggle.' },
              { k: 'who reads the images', v: 'A vision-language annotator (gemma4) answers a frozen question battery on each image, never seeing the prompt that produced it.' },
            ]}
          detail={<>
              <p>
                <strong>Weights and settings.</strong> SD 2.1 via <code>sd2-community/stable-diffusion-2-1</code> (the
                official repo became gated mid-project; the <code>v2-1_768-ema-pruned</code> files were verified
                identical). DDIM sampler, deterministic per seed, 30 steps, 768×768, guidance 7.5. Seeds are 0–49 and
                are the <em>same</em> 50 in every one of the 54 cells, so any difference between two cells is the
                prompt and nothing else.
              </p>
              <p>
                <strong>The rulers.</strong> DINOv3-7B CLS embeddings are the primary metric; a cell-to-cell distance
                is the cosine distance between per-variant mean feature vectors (the Naik &amp; Nushi construction).
                CLIP is carried as an independent second ruler and every distance chart can be switched to it, because
                a finding that only exists in one embedding space is a finding about that space.
              </p>
              <p>
                <strong>The annotator.</strong> One vision-language model, Gemma-4-E4B-QAT-w4a16, reads every image
                with the prompt withheld. Using a single instrument across all seven models is what makes their
                assumption counts comparable at all.
              </p>
              <p>
                <strong>Numbers on this page are derived, not typed.</strong> Every figure in the prose is read at
                render time from the exported JSON the analysis wrote. This is a rule with a history: it exists
                because typed numbers drifted from their sources twice.
              </p>
          </>}
        />
        </div>
      </Reveal>

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
