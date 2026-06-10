import { useState, type ReactNode } from "react";

const MONO = { fontFamily: "'JetBrains Mono', monospace" };

interface MethodEntry {
  name: string;
  tag: string;
  what: string;
  how: string;
  why: string;
  resource: { label: string; url: string };
}

const METHODS: MethodEntry[] = [
  {
    name: "CLIP / OpenCLIP",
    tag: "embedding model",
    what: "A model that maps images and text into the same vector space, trained on millions of image–caption pairs. SD uses it as its text encoder.",
    how: "We encode all prompts and generated images, then compare them with cosine similarity — for the 4-quadrant matrix, the UMAP, and cultural distances. Used carefully: CLIP is itself biased, so it never carries a claim alone.",
    why: "Its geometry is where the assumptions start — the modality gap and bag-of-words behaviour explain why prompts can't fully steer generation.",
    resource: { label: "Radford et al. 2021, arXiv:2103.00020", url: "https://arxiv.org/abs/2103.00020" },
  },
  {
    name: "FairFace",
    tag: "face classifier",
    what: "A face classifier (gender + 7 race groups) trained on a demographically balanced photo dataset.",
    how: "Detect face → crop → ResNet-34 classification, for every generated image. Validated against a hand-labeled subset; results reported as 'perceived' attributes, not ground truth.",
    why: "Turns a batch of 50 images into a measurable distribution — the core evidence for every demographic claim. CLIP-independent, so no circularity.",
    resource: { label: "Kärkkäinen & Joo, WACV 2021, arXiv:1908.04913", url: "https://arxiv.org/abs/1908.04913" },
  },
  {
    name: "DAAM",
    tag: "attention attribution",
    what: "Diffusion Attentive Attribution Maps — a heatmap per word showing which pixels that word controlled during generation.",
    how: "Hooks SD's cross-attention layers during generation and aggregates the maps across all layers and timesteps into one per-token heatmap.",
    why: "Makes binding failures visible: you can see 'red' lighting up the wrong object. No diffusion knowledge needed to read it.",
    resource: { label: "Tang et al. ACL 2023, arXiv:2210.04885", url: "https://arxiv.org/abs/2210.04885" },
  },
  {
    name: "Diffusion Lens",
    tag: "encoder interpretability",
    what: "A technique that decodes the text encoder's intermediate layers into images — showing what the model 'pictures' at each depth. It works on the whole prompt per layer, not on individual tokens (token attribution is DAAM's job).",
    how: "Hidden states from CLIP text-encoder layer ℓ are fed to the diffusion decoder instead of the final layer's output. Precomputed per prompt.",
    why: "Shows the assumption assembling inside the encoder, layer by layer — before a single pixel is generated.",
    resource: { label: "Toker et al. ACL 2024, arXiv:2403.05846", url: "https://arxiv.org/abs/2403.05846" },
  },
  {
    name: "DINOv2",
    tag: "visual features",
    what: "A self-supervised vision model producing image features with no text involved in training.",
    how: "One feature vector (CLS token) per image; average pairwise cosine similarity over 50 face crops = the homogeneity score per prompt.",
    why: "Our CLIP-independent ruler. Measuring CLIP's bias with CLIP would be circular; DINOv2 breaks that loop.",
    resource: { label: "Oquab et al. 2023, arXiv:2304.07193", url: "https://arxiv.org/abs/2304.07193" },
  },
  {
    name: "UMAP",
    tag: "dimensionality reduction",
    what: "An algorithm that projects high-dimensional vectors to 2D while preserving neighbourhood structure.",
    how: "All text + image embeddings reduced to 2D for the scatter plot.",
    why: "Makes the modality gap visible as two separated clouds — no math required of the viewer.",
    resource: { label: "McInnes et al. 2018, arXiv:1802.03426", url: "https://arxiv.org/abs/1802.03426" },
  },
  {
    name: "Prompt-to-Prompt",
    tag: "generation intervention",
    what: "A method for editing diffusion outputs by intervening on prompts or attention maps mid-generation.",
    how: "Two uses: (1) timestep swap — switch the prompt at step k, repeat over 12 seeds per k to get the lock-in curve; (2) attention swap — force cross-attention maps to exchange, proving attention causes the binding failure.",
    why: "Upgrades observations into causal claims: when the assumption locks in, and what mechanism is responsible.",
    resource: { label: "Hertz et al. ICLR 2023, arXiv:2208.01626", url: "https://arxiv.org/abs/2208.01626" },
  },
  {
    name: "Fair Diffusion",
    tag: "bias mitigation",
    what: "An inference-time method that steers generation toward a chosen demographic balance without retraining or changing the prompt.",
    how: "Semantic guidance adds or subtracts learned attribute directions (e.g. 'female') during denoising, with adjustable strength.",
    why: "Shows the assumption is a movable direction in the model — present by default, but not irreversible.",
    resource: { label: "Friedrich et al. 2023, arXiv:2302.10893", url: "https://arxiv.org/abs/2302.10893" },
  },
  {
    name: "GLIGEN / ControlNet",
    tag: "structured conditioning",
    what: "Extensions that condition SD on structure — bounding boxes, poses, edge maps — alongside text.",
    how: "Layout or pose inputs are injected directly into the U-Net through extra conditioning channels; we compare outputs with and without them.",
    why: "The strongest escape: it works by bypassing the text encoder entirely — confirming where the problem lives.",
    resource: { label: "Li et al. 2023, arXiv:2301.07093 · Zhang et al. 2023, arXiv:2302.05543", url: "https://arxiv.org/abs/2301.07093" },
  },
  {
    name: "WEAT",
    tag: "association test",
    what: "The Word Embedding Association Test — measures how strongly a concept associates with anchor words like 'man'/'woman' in an embedding space.",
    how: "Cosine association of each candidate occupation against gender/race anchors in CLIP text space, used to rank and select the study's prompts before any generation.",
    why: "Lets us pick prompts with documented assumption strength — and exposed a finding: text-space associations don't match what generation produces.",
    resource: { label: "Caliskan, Bryson & Narayanan, Science 2017 · arXiv:1608.07187", url: "https://arxiv.org/abs/1608.07187" },
  },
];

function MethodItem({ m }: { m: MethodEntry }) {
  const [open, setOpen] = useState(false);
  const rows: [string, ReactNode][] = [
    ["what it is", m.what],
    ["how we use it", m.how],
    ["why it matters here", m.why],
    [
      "resource",
      <a
        key="r"
        href={m.resource.url}
        target="_blank"
        rel="noreferrer"
        className="text-[#4f46e5] underline decoration-[#c7d2fe] hover:decoration-[#4f46e5]"
      >
        {m.resource.label}
      </a>,
    ],
  ];

  return (
    <div className="border border-[#e0ddd6] rounded-[8px] bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-[10px] flex items-center gap-3 hover:bg-[#faf9f6] transition-colors"
      >
        <span className="text-[9px] text-[#8a8374] w-[10px]" style={MONO}>
          {open ? "▼" : "▶"}
        </span>
        <span className="text-[13px] font-medium text-[#1a1a1a]">{m.name}</span>
        <span className="ml-auto text-[9px] text-[#888] bg-[#f5f4f0] px-[7px] py-[2px] rounded-[3px] whitespace-nowrap" style={MONO}>
          {m.tag}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 flex flex-col gap-[8px] border-t border-dashed border-[#f0ede6]">
          {rows.map(([label, content]) => (
            <div key={label as string} className="flex gap-3 text-[12px] leading-[1.6]">
              <span
                className="w-[120px] shrink-0 text-[9px] uppercase tracking-[0.06em] text-[#867f6f] pt-[3px]"
                style={MONO}
              >
                {label}
              </span>
              <span className="text-[#555]">{content}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Methods() {
  return (
    <div id="methods" className="py-16 px-12 border-b border-[#e0ddd6]" style={{ background: "#f5f4f0" }}>
      <div className="max-w-[860px] mx-auto">
        <div className="flex items-baseline gap-4 mb-2">
          <span
            className="text-[10px] font-semibold tracking-[0.1em] uppercase px-[8px] py-[3px] rounded-[3px]"
            style={{ background: "#e7e5e0", color: "#555", ...MONO }}
          >
            Appendix
          </span>
          <h2 className="text-[22px] font-medium text-[#1a1a1a]" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>
            Methods & tools
          </h2>
        </div>
        <p className="text-[13px] text-[#888] mb-8 max-w-[640px] leading-[1.6]">
          Everything used in this explorable, in one place: what each tool is, how it was applied,
          and why it carries weight in the argument. Click any entry to expand.
        </p>
        <div className="flex flex-col gap-[8px]">
          {METHODS.map((m) => (
            <MethodItem key={m.name} m={m} />
          ))}
        </div>
      </div>
    </div>
  );
}
