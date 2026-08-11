// ─────────────────────────────────────────────────────────────────────────────
// The introduction, and the image sets it rests on. Written 2026-08-10 (Giray's
// text, verbatim) as the first of the new sections: introduction · underspecified
// alignment · alignment source · semantic assumptions · assumption stabilization ·
// conclusion · references · acknowledgements.
//
// It replaces Overview.tsx, whose jump list was dismissed earlier the same day and
// whose method paragraph is superseded by the setup prose here.
//
// The Setup block that used to close this section went with all the others on
// 2026-08-11 (Giray). The weights, sampler and rulers now live only in the model
// weights list in Closing.tsx, which is the right home for them.
// ─────────────────────────────────────────────────────────────────────────────
import { Reveal } from '../components/Scene'
import { GENERATORS } from '../data/references'

/* No heading and no scene number, 2026-08-11 (Giray): the introduction runs
   straight on from the author block, so anything between the two would be the
   break it is meant not to have. A plain <section> rather than SceneShell for
   that reason — the rail's `introduction` stop anchors on the wrapping #intro div
   in Home.tsx, so it still lands here. */
export default function Introduction() {
  return (
    <section className="relative mx-auto w-full max-w-6xl px-6 pt-4 pb-24 md:pb-32">
      <Reveal>
        <p className="prose-scene max-w-2xl">
          Text-to-image (T2I) models generate complex visual content from textual prompts by learning associations
          between textual and visual concepts. These associations shape the model's assumptions about the world. When a
          prompt leaves details unspecified, the model relies on its assumptions to resolve the gaps. Some of these
          assumptions appear more often in the model output than others, reducing the model’s diversity and sometimes
          reflecting harmful biases [1, 2].
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <p className="prose-scene mt-6 max-w-2xl">
          Consider a wedding scene. Its visual representation may differ depending on whether the wedding takes place
          in Japan, India, or the United States, including differences in people’s appearance and the surroundings. A
          prompt such as “a wedding in
          Japan” specifies the geographic context but still leaves the visual details for the model to resolve based on
          its assumptions about that country. What details does the model assume for each country? And what happens
          when the country itself is left unspecified? Do the model assumptions align similarly with different
          countries, or are they skewed toward some more than others? In this article, we make these geographic
          assumptions explorable across different T2I models. We study how they appear when geographic context is
          specified or unspecified, what semantic concepts they reflect, and whether they arise before or during image
          generation. Through experiments with Stable Diffusion 2.1 [5] we further experiment, for this particular
          model, how they respond to stronger prompt guidance, and when they become difficult to change during
          denoising.
        </p>
      </Reveal>

      <Reveal delay={0.08}>
        <h3 className="font-display mt-14 max-w-3xl text-2xl leading-snug font-light md:text-3xl">
          Image Sets and Experimental Setup
        </h3>
      </Reveal>

      <Reveal delay={0.1}>
        <p className="prose-scene mt-5 max-w-2xl">
          Our experiments use generations from seven T2I models:{' '}
          {GENERATORS.map((m, i) => (
            <span key={m.label}>
              {i > 0 && ', '}
              <a
                href={m.url}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-border underline-offset-2 hover:decoration-amber-200"
              >
                {m.label}
              </a>
              {m.ref != null && ` [${m.ref}]`}
            </span>
          ))}
          . We consider six scenes: wedding, funeral,
          celebration, family, breakfast, and school. Each scene is represented by one geographically unspecified
          prompt, “a &lt;scene&gt;”, and eight country-specific prompts, “a &lt;scene&gt; in &lt;country&gt;”, covering
          the United States, Germany, Russia, Indonesia, Japan, Egypt, India, and Nigeria. For each prompt, we generate
          50 images using the same fixed seeds across all seven models.
        </p>
      </Reveal>

      <Reveal delay={0.12}>
        <p className="prose-scene mt-5 max-w-2xl">
          Each model is analyzed independently. We encourage the reader to switch between models using the floating
          control at the top of this webpage. Some analyses are available only for Stable Diffusion (as other models
          rely on different architectures and do not expose directly controllable variables; the same intervention
          cannot be replicated across them).
        </p>
      </Reveal>

    </section>
  )
}
