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

export const AUTHOR = {
  // TODO(giray): full name + affiliation before submitting. The venue is
  // non-anonymous; Patchscopes lists names only, Transformer Explainer lists
  // names + institution. Contact is already public in the domain's WHOIS.
  name: 'Giray',
  affiliation: '',
  email: 'girayn5@gmail.com',
  date: 'August 2026',
}

export interface Reference {
  id: string
  authors: string
  year: number
  title: string
  venue: string
  url: string
  /** why it is here — rendered as the trailing clause, so the list argues rather than lists */
  role: string
}

export const REFERENCES: Reference[] = [
  // ── what the page positions against ────────────────────────────────────────
  {
    id: 'naik2023',
    authors: 'Naik, R. & Nushi, B.',
    year: 2023,
    title: 'Social Biases through the Text-to-Image Generation Lens',
    venue: 'AIES 2023, 786–808',
    url: 'https://arxiv.org/abs/2304.06034',
    role: 'the method this page extends: everyday-situation prompts × country qualifiers, measured as embedding distance from the unqualified default',
  },
  {
    id: 'bianchi2023',
    authors: 'Bianchi, F. et al.',
    year: 2023,
    title: 'Easily Accessible Text-to-Image Generation Amplifies Demographic Stereotypes at Large Scale',
    venue: 'FAccT 2023',
    url: 'https://arxiv.org/abs/2211.03759',
    role: 'establishes that the defaults exist and amplify; this page asks when in generation they commit and what they cost to override',
  },
  {
    id: 'luccioni2023',
    authors: 'Luccioni, S. et al.',
    year: 2023,
    title: 'Stable Bias: Analyzing Societal Representations in Diffusion Models',
    venue: 'NeurIPS 2023 Datasets & Benchmarks',
    url: 'https://arxiv.org/abs/2303.11408',
    role: 'the demographic axis, at scale — the axis this page deliberately does not work on',
  },
  {
    id: 'chinchure2023',
    authors: 'Chinchure, A. et al.',
    year: 2023,
    title: 'TIBET: Identifying and Evaluating Biases in Text-to-Image Generative Models',
    venue: 'arXiv:2312.01261',
    url: 'https://arxiv.org/abs/2312.01261',
    role: 'closest prior art for naming assumptions: LLM-proposed bias axes evaluated by VQA, at the endpoint only',
  },
  {
    id: 'dinca2024',
    authors: "D'Incà, M. et al.",
    year: 2024,
    title: 'OpenBias: Open-set Bias Detection in Text-to-Image Generative Models',
    venue: 'CVPR 2024',
    url: 'https://arxiv.org/abs/2404.07990',
    role: 'open-set bias detection, also endpoint-only — the depth profile (lock-in step, steerability, homogeneity) is what this page adds',
  },
  {
    id: 'alnouri2026',
    authors: 'Alnouri, F. et al.',
    year: 2026,
    title: 'Visual Fingerprints for LLM Generation Comparison',
    venue: 'arXiv:2605.06054',
    url: 'https://arxiv.org/abs/2605.06054',
    role: 'the distribution-over-choices frequency matrix that the attribute tables in Part IV are modelled on',
  },

  // ── the mechanism: training data ───────────────────────────────────────────
  {
    id: 'schuhmann2022',
    authors: 'Schuhmann, C. et al.',
    year: 2022,
    title: 'LAION-5B: An open large-scale dataset for training next generation image-text models',
    venue: 'NeurIPS 2022 Datasets & Benchmarks',
    url: 'https://arxiv.org/abs/2210.08402',
    role: "SD 2.1's training set, and the 0.28 CLIP-cosine filter its own §G.2 calls “only a heuristic”",
  },
  {
    id: 'hong2024',
    authors: 'Hong, R. et al.',
    year: 2024,
    title: "Who's in and who's out? A case study of multimodal CLIP-filtering in DataComp",
    venue: 'arXiv:2405.08209',
    url: 'https://arxiv.org/abs/2405.08209',
    role: 'non-Western content passes CLIP filtering at systematically lower rates — the mechanism behind the density axis in scene 10',
  },

  // ── the models measured ────────────────────────────────────────────────────
  {
    id: 'rombach2022',
    authors: 'Rombach, R. et al.',
    year: 2022,
    title: 'High-Resolution Image Synthesis with Latent Diffusion Models',
    venue: 'CVPR 2022',
    url: 'https://arxiv.org/abs/2112.10752',
    role: 'the architecture behind Stable Diffusion 2.1, the primary model here',
  },
  {
    id: 'song2021',
    authors: 'Song, J., Meng, C. & Ermon, S.',
    year: 2021,
    title: 'Denoising Diffusion Implicit Models',
    venue: 'ICLR 2021',
    url: 'https://arxiv.org/abs/2010.02502',
    role: 'the deterministic sampler: same seed, identical trajectory — without which the prompt-swap experiments in Part II mean nothing',
  },
  {
    id: 'radford2021',
    authors: 'Radford, A. et al.',
    year: 2021,
    title: 'Learning Transferable Visual Models From Natural Language Supervision',
    venue: 'ICML 2021',
    url: 'https://arxiv.org/abs/2103.00020',
    role: 'CLIP — both the text encoder being conditioned on and one of the two rulers offered in the metric switch',
  },
  {
    id: 'cherti2023',
    authors: 'Cherti, M. et al.',
    year: 2023,
    title: 'Reproducible scaling laws for contrastive language-image learning',
    venue: 'CVPR 2023',
    url: 'https://arxiv.org/abs/2212.07143',
    role: "OpenCLIP ViT-H/14, which is the encoder SD 2.1 actually ships with",
  },

  // ── the instruments ────────────────────────────────────────────────────────
  {
    id: 'simeoni2025',
    authors: 'Siméoni, O. et al.',
    year: 2025,
    title: 'DINOv3',
    venue: 'arXiv:2508.10104',
    url: 'https://arxiv.org/abs/2508.10104',
    role: 'the canonical embedding for every distance and homogeneity number on this page: self-supervised, so it shares no text-alignment confound with the model being measured (though LVD-1689M is still curated web data)',
  },
  {
    id: 'friedman2023',
    authors: 'Friedman, D. & Dieng, A. B.',
    year: 2023,
    title: 'The Vendi Score: A Diversity Evaluation Metric for Machine Learning',
    venue: 'TMLR 2023',
    url: 'https://arxiv.org/abs/2210.02410',
    role: 'the "how many genuinely different pictures" count used wherever variety is reported',
  },
  {
    id: 'ghosh2024',
    authors: 'Ghosh, S. et al.',
    year: 2024,
    title:
      "“I don't see myself represented here at all”: User Experiences of Stable Diffusion Outputs Containing Representational Harms across Gender Identities and Nationalities",
    venue: 'arXiv:2408.01594',
    url: 'https://arxiv.org/abs/2408.01594',
    role: 'the pairwise intra-set similarity method behind the stereotyping-inversion result, and the user study linking homogeneity to perceived harm',
  },
  {
    id: 'mcinnes2018',
    authors: 'McInnes, L., Healy, J. & Melville, J.',
    year: 2018,
    title: 'UMAP: Uniform Manifold Approximation and Projection for Dimension Reduction',
    venue: 'arXiv:1802.03426',
    url: 'https://arxiv.org/abs/1802.03426',
    role: 'the projection in scenes 05 and 17 — a view, never evidence: every claim is made on the distances, not the picture',
  },
  {
    id: 'mantel1967',
    authors: 'Mantel, N.',
    year: 1967,
    title: 'The Detection of Disease Clustering and a Generalized Regression Approach',
    venue: 'Cancer Research 27(2), 209–220',
    url: 'https://aacrjournals.org/cancerres/article/27/2_Part_1/209/476508',
    role: 'the permutation test behind scene 09: whether the text matrix and the image matrix agree beyond chance',
  },
  {
    id: 'gwet2008',
    authors: 'Gwet, K. L.',
    year: 2008,
    title: 'Computing inter-rater reliability and its variance in the presence of high agreement',
    venue: 'British Journal of Mathematical and Statistical Psychology 61(1), 29–48',
    url: 'https://doi.org/10.1348/000711006X126600',
    role: "AC1 — the agreement statistic the questionnaire is gated on, chosen over Cohen's κ precisely because these answers are high-agreement and κ paradoxes there",
  },

  // ── when the assumption commits ────────────────────────────────────────────
  {
    id: 'hertz2023',
    authors: 'Hertz, A. et al.',
    year: 2023,
    title: 'Prompt-to-Prompt Image Editing with Cross Attention Control',
    venue: 'ICLR 2023',
    url: 'https://arxiv.org/abs/2208.01626',
    role: 'the mid-generation conditioning swap that Part II turns into the lock-in curve',
  },
  {
    id: 'wang2023',
    authors: 'Wang, B. & Vastola, J. J.',
    year: 2023,
    title: 'Diffusion Models Generate Images Like Painters: an Analytical Theory of Outline First, Details Later',
    venue: 'arXiv:2303.02490',
    url: 'https://arxiv.org/abs/2303.02490',
    role: 'why early lock-in is expected rather than surprising: high-variance scene features commit in the first 10–20% of steps',
  },
  {
    id: 'bradley2024',
    authors: 'Bradley, A. & Nakkiran, P.',
    year: 2024,
    title: 'Classifier-Free Guidance is a Predictor-Corrector',
    venue: 'arXiv:2408.09000',
    url: 'https://arxiv.org/abs/2408.09000',
    role: 'why the empty prompt at standard guidance — not guidance 0 — is the correct picture of the prior',
  },
  {
    id: 'tang2023',
    authors: 'Tang, R. et al.',
    year: 2023,
    title: 'What the DAAM: Interpreting Stable Diffusion Using Cross Attention',
    venue: 'ACL 2023',
    url: 'https://arxiv.org/abs/2210.04885',
    role: 'the per-token pixel attribution used to ask which pixels the country word actually controlled',
  },

  // ── the venue's own prior art ──────────────────────────────────────────────
  {
    id: 'humer2023',
    authors: 'Humer, C. et al.',
    year: 2023,
    title: 'AMUMO: Analyzing Multi-Modal Models',
    venue: 'VISxAI 2023',
    url: 'https://christina.humer.dev/Amumo/',
    role: 'the four-quadrant similarity-matrix template scene 09 builds on, here with a designed cultural gradient as ground truth rather than emergent clusters',
  },
]

/** The instruments that are themselves models, named where the page relies on them. */
export const ANNOTATORS = [
  { label: 'Gemma-4-E4B-it', url: 'https://huggingface.co/google/gemma-4-E4B-it-qat-w4a16-ct' },
  { label: 'DINOv3 ViT-7B/16', url: 'https://huggingface.co/facebook/dinov3-vit7b16-pretrain-lvd1689m' },
  { label: 'Stable Diffusion 2.1', url: 'https://huggingface.co/stabilityai/stable-diffusion-2-1' },
]
