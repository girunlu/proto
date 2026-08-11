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

/* The thirteen Giray supplied, 2026-08-11, in the order the prose cites them:
     [1,2] introduction · [3] geographic alignment · [4] semantic assumptions
     [5] SD 2.1 · [6] SDXL · [7] SD 3.5 · [8] Kolors · [9] HunyuanDiT · [10] Qwen
     [11] DINOv3 · [12] CLIP · [13] the annotator
   Order is load-bearing: the introduction prints these numbers from GENERATORS[].ref
   and the list renders its index, so inserting an entry renumbers the prose with it.

   Every arXiv link here was opened and read back before being stored — the five
   supplied ids plus SDXL's, checked against title and first author, none of them
   constructed from memory. The remaining six are conference papers whose DOIs were
   not in the supplied list; they render as plain text rather than a guessed link. */
export const REFERENCES: Reference[] = [
  {
    id: 'chinchure2024',
    authors: 'Chinchure, A., et al.',
    year: 2024,
    title: 'TIBET: Identifying and Evaluating Biases in Text-to-Image Generative Models',
    venue: 'European Conference on Computer Vision. Cham: Springer Nature Switzerland',
  },
  {
    id: 'eschner2025',
    authors: 'Eschner, J., et al.',
    year: 2025,
    title: 'Interactive Discovery and Exploration of Visual Bias in Generative Text-to-Image Models',
    venue: 'Computer Graphics Forum, Vol. 44, No. 3',
  },
  {
    id: 'basu2023',
    authors: 'Basu, A., Venkatesh Babu, R., & Pruthi, D.',
    year: 2023,
    title: 'Inspecting the Geographical Representativeness of Images from Text-to-Image Models',
    venue: '2023 IEEE/CVF International Conference on Computer Vision (ICCV). IEEE',
  },
  {
    id: 'franchi2025',
    authors: 'Franchi, G., et al.',
    year: 2025,
    title: 'Towards Understanding and Quantifying Uncertainty for Text-to-Image Generation',
    venue: '2025 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR). IEEE',
  },
  {
    id: 'rombach2022',
    authors: 'Rombach, R., et al.',
    year: 2022,
    title: 'High-Resolution Image Synthesis with Latent Diffusion Models',
    venue: '2022 IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR). IEEE',
  },
  {
    /* Replaced 2026-08-11 at Giray's confirmation. The supplied [6] was Meng et al.,
       SDEdit — an image-editing method, not the model the introduction cites [6] for.
       Title, authors, venue and arXiv id all checked against arxiv.org/abs/2307.01952
       and the ICLR 2024 proceedings, not recalled. */
    id: 'podell2024',
    authors: 'Podell, D., et al.',
    year: 2024,
    title: 'SDXL: Improving Latent Diffusion Models for High-Resolution Image Synthesis',
    venue: 'The Twelfth International Conference on Learning Representations (ICLR)',
    url: 'https://arxiv.org/abs/2307.01952',
  },
  {
    id: 'esser2024',
    authors: 'Esser, P., et al.',
    year: 2024,
    title: 'Scaling Rectified Flow Transformers for High-Resolution Image Synthesis',
    venue: 'Forty-first International Conference on Machine Learning (ICML)',
  },
  {
    id: 'kolors2024',
    authors: 'Kolors Team',
    year: 2024,
    title: 'Kolors: Effective Training of Diffusion Model for Photorealistic Text-to-Image Synthesis',
    venue: 'Technical report',
    url: 'https://github.com/Kwai-Kolors/Kolors/blob/master/imgs/Kolors_paper.pdf',
  },
  {
    id: 'li2024',
    authors: 'Li, Z., et al.',
    year: 2024,
    title: 'Hunyuan-DiT: A Powerful Multi-Resolution Diffusion Transformer with Fine-Grained Chinese Understanding',
    venue: 'arXiv preprint arXiv:2405.08748',
    url: 'https://arxiv.org/abs/2405.08748',
  },
  {
    id: 'wu2025',
    authors: 'Wu, C., et al.',
    year: 2025,
    title: 'Qwen-Image Technical Report',
    venue: 'arXiv preprint arXiv:2508.02324',
    url: 'https://arxiv.org/abs/2508.02324',
  },
  {
    id: 'simeoni2025',
    authors: 'Siméoni, O., et al.',
    year: 2025,
    title: 'DINOv3',
    venue: 'arXiv preprint arXiv:2508.10104',
    url: 'https://arxiv.org/abs/2508.10104',
  },
  {
    id: 'radford2021',
    authors: 'Radford, A., et al.',
    year: 2021,
    title: 'Learning Transferable Visual Models from Natural Language Supervision',
    venue: 'International Conference on Machine Learning (ICML). PMLR',
  },
  {
    id: 'gemma2026',
    authors: 'Gemma Team',
    year: 2026,
    title: 'Gemma 4 Technical Report',
    venue: 'arXiv preprint arXiv:2607.02770',
    url: 'https://arxiv.org/abs/2607.02770',
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
/* The seven generators, in the order the introduction names them. Exported on its
   own because the introduction now links each model name to its repo: one list
   feeds both that sentence and the weights table below, so a label there can never
   drift from the link it carries. */
/* `ref` is the bracketed citation number the introduction prints after the model
   name. SD 2.1 and FLUX.1 [dev] carry none in that sentence: SD 2.1 is cited as [5]
   a paragraph earlier, and no citation was supplied for FLUX. The numbers are only
   rendered in the introduction, never in the weights table below. */
export const GENERATORS: { label: string; url: string; ref?: number }[] = [
  /* the official stabilityai repo became gated mid-project; these are the
     verified-identical v2-1_768-ema-pruned files actually used */
  { label: 'Stable Diffusion 2.1', url: 'https://huggingface.co/sd2-community/stable-diffusion-2-1' },
  { label: 'SDXL 1.0', url: 'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0' , ref: 6 },
  { label: 'Stable Diffusion 3.5 Large', url: 'https://huggingface.co/stabilityai/stable-diffusion-3.5-large' , ref: 7 },
  { label: 'FLUX.1 [dev]', url: 'https://huggingface.co/black-forest-labs/FLUX.1-dev' },
  { label: 'Kolors', url: 'https://huggingface.co/Kwai-Kolors/Kolors-diffusers' , ref: 8 },
  { label: 'HunyuanDiT v1.2', url: 'https://huggingface.co/Tencent-Hunyuan/HunyuanDiT-v1.2-Diffusers' , ref: 9 },
  { label: 'Qwen-Image', url: 'https://huggingface.co/Qwen/Qwen-Image' , ref: 10 },
]

export const WEIGHTS: { group: string; models: { label: string; url: string }[] }[] = [
  { group: 'image generators', models: GENERATORS },
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
