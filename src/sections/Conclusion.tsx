// ─────────────────────────────────────────────────────────────────────────────
// The conclusion. Giray's text, revised 2026-08-11: one paragraph rather than two,
// "the models resolve them", and "unspecified" throughout.
//
// Every claim in it was checked against the exported data before it went in:
//   · closer to the US and Germany — mean rank US 1.79, DE 2.45 across 7 models ×
//     6 scenes, and one of US/DE/RU is the closest reference in 38 of 42 cells
//   · not inherited from the text representation — mean Mantel r = +0.046 over the
//     42 model × scene pairs, 5 of them reaching p < 0.05
//   · guidance does not eliminate it — mean distance rises 0.051 → 0.339 across the
//     sweep while the US moves from 3rd-closest to 2.33 mean rank, i.e. it sharpens
//   · difficult to redirect early in denoising — logistic switchover at step 9.6
//     of 30 (95% CI 8.4–11.3)
// ─────────────────────────────────────────────────────────────────────────────
// Named rather than phrased, 2026-08-11 (Giray), same treatment as the
// acknowledgements: the title is the section's name and the kicker is dropped,
// because it said the same word six pixels higher.
import { SceneShell, Reveal } from '../components/Scene'

export default function Conclusion() {
  return (
    <SceneShell number="∴" title={<>Conclusion</>} lead>
      <Reveal>
        <p className="prose-scene max-w-2xl">
          Text-to-image models do not simply reproduce what is written in a prompt. When details are left unspecified,
          the models resolve them through their learned assumptions about the world. Across the models and scenes
          explored here, geographically unspecified generations were not equally aligned with all geographic
          references, but tended to be closer to some countries, particularly the United States and Germany, than to
          others. A visual distance-based comparison between textual and visual embeddings suggests that this geographic
          alignment is not simply inherited from the textual representation. Experiments with Stable Diffusion 2.1
          further indicate that it cannot be eliminated merely by increasing the strength of prompt guidance, and that
          country-specific visual characteristics become increasingly difficult to redirect relatively early in the
          denoising process. Examining the images semantically further revealed recurring assumptions about clothing,
          objects, settings, and other visual attributes. Making these assumptions explorable is an important step
          toward understanding what text-to-image models add beyond what users explicitly ask for.
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <p className="prose-scene mt-8 max-w-2xl text-foreground/70">
          If you have not yet explored the results from the other models on this webpage, we encourage you to do so:
          fine-grained findings vary, but broader patterns are shared.
        </p>
      </Reveal>
    </SceneShell>
  )
}
