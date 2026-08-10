// ─────────────────────────────────────────────────────────────────────────────
// The introduction, and the image sets it rests on. Written 2026-08-10 (Giray's
// text, verbatim) as the first of the new sections: introduction · underspecified
// alignment · alignment source · semantic assumptions · assumption stabilization ·
// conclusion · references · acknowledgements.
//
// It replaces Overview.tsx, whose jump list was dismissed earlier the same day and
// whose method paragraph is superseded by the setup prose here. Overview's Setup
// block moves in below rather than being rewritten: it is the same grid, and its
// detail tier is the only place the weights, sampler and rulers are pinned down.
// ─────────────────────────────────────────────────────────────────────────────
import { SceneShell, Reveal } from '../components/Scene'
import { Setup } from '../components/Viz'
import { STATS } from '../data/research'
import { MODELS } from '../data/modelData'

export default function Introduction() {
  return (
    <SceneShell number="·" kicker="introduction" title={<>What a prompt leaves unsaid.</>} lead>
      <Reveal>
        <p className="prose-scene max-w-2xl">
          Text-to-image (T2I) models generate complex visual content from textual prompts by learning associations
          between textual and visual concepts. These associations shape the model's assumptions about the world. When a
          prompt leaves details unspecified, the model relies on its assumptions to resolve the gaps. Some of these
          assumptions appear more often than others in the model output, reducing its diversity, and sometimes reflect
          harmful biases [1, 2].
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <p className="prose-scene mt-6 max-w-2xl">
          Consider a scene such as a wedding. Its visual representation may differ depending on whether it takes place
          in Japan, India, or the United States, from the people to the surroundings. A prompt such as “a wedding in
          Japan” specifies the geographic context but still leaves the visual details for the model to resolve based on
          its assumptions about that country. What details does the model assume for each country? And what happens
          when the country itself is left underspecified? Do the model assumptions align similarly with different
          countries, or are they skewed toward some more than others? In this article, we make these geographic
          assumptions explorable across different T2I models. We study how they appear when geographic context is
          specified or underspecified, what semantic concepts they reflect, and whether they arise before or during
          image generation. Through experiments with Stable Diffusion 2.1 we further experiment, for this particular
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
          Our experiments use generations from seven T2I models: Stable Diffusion 2.1, SDXL 1.0, Stable Diffusion 3.5
          Large, FLUX.1 [dev], Kolors, HunyuanDiT v1.2, Qwen-Image. We consider six scenes: wedding, funeral,
          celebration, family, breakfast, and school. Each scene is represented by one geographically unspecified
          prompt, “a &lt;scene&gt;”, and eight country-specific prompts, “a &lt;scene&gt; in &lt;country&gt;”, covering
          the United States, Germany, Russia, Indonesia, Japan, Egypt, India, and Nigeria. For each prompt, we generate
          50 images using the same fixed seeds across all seven models.
        </p>
      </Reveal>

      <Reveal delay={0.12}>
        <p className="prose-scene mt-5 max-w-2xl">
          Each model is analyzed independently. We encourage the reader to switch between models using the floating
          control at the top of this webpage. Some analyses are available only for Stable Diffusion, as other models
          rely on different architectures and do not expose directly controllable variables; the same intervention
          cannot be replicated across them.
        </p>
      </Reveal>

      {/* The parameters behind the prose above, stated once. Every section's own
          setup block carries only what that section adds to this. */}
      <Reveal delay={0.14}>
        <div className="mt-8 max-w-3xl">
          <Setup
            rows={[
              { k: 'the grid', v: `Six scenes × (unspecified + eight countries) = ${STATS.prompts} prompts, each generated ${STATS.seeds} times on the same fixed seeds, in ${MODELS.length} models. Nothing differs between two cells but the words.` },
              { k: 'how they were made', v: 'Stable Diffusion 2.1 is the baseline: DDIM, 30 steps, 768×768, guidance 7.5. The other six run the identical grid at their own documented guidance.' },
              { k: 'the two rulers', v: 'DINOv3-7B cosine distance throughout, with CLIP as an independent second ruler on every chart that carries a toggle.' },
              { k: 'who reads the images', v: 'A vision-language annotator (gemma4) answers a frozen question battery on each image, never seeing the prompt that produced it.' },
            ]}
            detail={<>
              <p>
                <strong>Weights and settings.</strong> SD 2.1 via <code>sd2-community/stable-diffusion-2-1</code> (the
                official repo became gated mid-project; the <code>v2-1_768-ema-pruned</code> files were verified
                identical). DDIM sampler, deterministic per seed, 30 steps, 768×768, guidance 7.5. Seeds are 0–49 and
                are the <em>same</em> 50 in every one of the {STATS.prompts} cells, so any difference between two cells
                is the prompt and nothing else.
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
    </SceneShell>
  )
}
