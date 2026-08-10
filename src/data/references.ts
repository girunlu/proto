// ─────────────────────────────────────────────────────────────────────────────
// The scholarship layer. VISxAI's blog-post track is public and non-anonymous,
// and the page named SD 2.1, CLIP, DINOv3, LAION, UMAP, Vendi, Mantel, AC1 and
// DAAM in eighteen scenes without citing one of them.
//
// Every entry below was checked against the actual paper on 2026-07-31, not
// copied from master_docs/2nd_degree_not_important/references.md — that file
// carried two errors (see the `fixed` notes) and one unverified id.
// Scope rule: cite what the page actually uses or positions against. Work that
// was done but is not shown (Diffusion Lens, DINOv2, the modality gap) is not
// listed here — a reference list is not a lab inventory.
// ─────────────────────────────────────────────────────────────────────────────

/* the byline, filled 2026-08-06 from review_2026-07-30/AUTHOR_DETAILS_FILL_IN.md.
   All five authors: Visual Data Science Lab, Institute of Computer Graphics,
   Johannes Kepler University Linz. */
export const AUTHORS = [
  {
    name: 'Giray Ünlü',
    affiliation: 'AI Engineering, Visual Data Science Lab, Johannes Kepler University Linz',
    email: 'girayn5@gmail.com',
  },
  { name: 'Amal Alnouri', affiliation: 'Visual Data Science Lab, Johannes Kepler University Linz', email: 'amal.alnouri@jku.at' },
  { name: 'Ahmed Mansour', affiliation: 'Visual Data Science Lab, Johannes Kepler University Linz', email: 'ahmed.mansour@jku.at' },
  { name: 'Andreas Hinterreiter', affiliation: 'Visual Data Science Lab, Johannes Kepler University Linz', email: 'andreas.hinterreiter@jku.at' },
  { name: 'Marc Streit', affiliation: 'Visual Data Science Lab, Johannes Kepler University Linz', email: 'marc.streit@jku.at' },
]
export const PUB_DATE = 'August 2026'

export interface Reference {
  id: string
  authors: string
  year: number
  title: string
  venue: string
  /* optional: a reference with no link renders as plain text rather than a dead
     or invented one */
  url?: string
  /** why it is here — rendered as the trailing clause, so the list argues rather than lists */
  role?: string
}

export const REFERENCES: Reference[] = [
  /* Replaced 2026-08-10 with the four Giray supplied, in the order the prose cites
     them: [1,2] in the introduction, [3] in underspecified alignment, [4] in
     semantic assumptions. No `url` is given on any of them: the source list carried
     none, and guessing an arXiv id or a DOI is the kind of plausible-looking error
     that is very hard to catch later. Add them and the list will link itself. */
  {
    id: 'chinchure2024',
    authors: 'Chinchure, A. et al.',
    year: 2024,
    title: 'TIBET: Identifying and Evaluating Biases in Text-to-Image Generative Models',
    venue: 'European Conference on Computer Vision. Cham: Springer Nature Switzerland',
  },
  {
    id: 'eschner2025',
    authors: 'Eschner, J. et al.',
    year: 2025,
    title: 'Interactive Discovery and Exploration of Visual Bias in Generative Text-to-Image Models',
    venue: 'Computer Graphics Forum, Vol. 44, No. 3',
  },
  {
    id: 'basu2023',
    authors: 'Basu, A., Babu, R. V. & Pruthi, D.',
    year: 2023,
    title: 'Inspecting the Geographical Representativeness of Images from Text-to-Image Models',
    venue: '2023 IEEE/CVF International Conference on Computer Vision (ICCV). IEEE',
  },
  {
    id: 'franchi2025',
    authors: 'Franchi, G. et al.',
    year: 2025,
    title: 'Towards Understanding and Quantifying Uncertainty for Text-to-Image Generation',
    venue: '2025 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR). IEEE',
  },
]

/* Every set of weights the page's numbers came out of, grouped by the job it did.
   Repo ids are the ones the run scripts actually loaded — phase2_generation/
   run_cross_model_batch.py and utils/download_models.py for the generators,
   phase3_analysis for the two rulers — not a from-memory guess at the canonical
   name of each model.

   This used to list three: SD 2.1, the annotator and DINOv3. Part V is an entire
   argument about seven models from five developers, and six of them were uncredited
   and unlinked, which is not a citation standard anyone would accept of a figure.

   ONE ANNOTATOR. qwen3_vl was retired on 2026-07-31 and the whole page is narrated
   from gemma4 alone; there is no second reader to name here, and if one is ever
   added this list is where it becomes visible. */
export const WEIGHTS: { group: string; models: { label: string; url: string }[] }[] = [
  {
    group: 'image generators',
    models: [
      /* the official stabilityai repo became gated mid-project; these are the
         verified-identical v2-1_768-ema-pruned files actually used */
      { label: 'Stable Diffusion 2.1', url: 'https://huggingface.co/sd2-community/stable-diffusion-2-1' },
      { label: 'SDXL 1.0', url: 'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0' },
      { label: 'Stable Diffusion 3.5 Large', url: 'https://huggingface.co/stabilityai/stable-diffusion-3.5-large' },
      { label: 'FLUX.1 [dev]', url: 'https://huggingface.co/black-forest-labs/FLUX.1-dev' },
      { label: 'Kolors', url: 'https://huggingface.co/Kwai-Kolors/Kolors-diffusers' },
      { label: 'HunyuanDiT v1.2', url: 'https://huggingface.co/Tencent-Hunyuan/HunyuanDiT-v1.2-Diffusers' },
      { label: 'Qwen-Image', url: 'https://huggingface.co/Qwen/Qwen-Image' },
    ],
  },
  {
    group: 'the annotator, one model reads every image on this page',
    models: [{ label: 'Gemma-4-E4B-it', url: 'https://huggingface.co/google/gemma-4-E4B-it-qat-w4a16-ct' }],
  },
  {
    group: 'embeddings, the two rulers',
    models: [
      { label: 'DINOv3 ViT-7B/16', url: 'https://huggingface.co/facebook/dinov3-vit7b16-pretrain-lvd1689m' },
      { label: 'CLIP ViT-L/14', url: 'https://huggingface.co/openai/clip-vit-large-patch14' },
    ],
  },
]
