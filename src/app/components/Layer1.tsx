import { useMemo, useState } from "react";
import { Section, ToolCard, ToolsGrid, PlanNote } from "./ToolCard";

const MONO = { fontFamily: "'JetBrains Mono', monospace" };

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function UMAPScatter() {
  const [hovered, setHovered] = useState<number | null>(null);

  const points = useMemo(() => {
    const rand = seededRandom(42);
    const imgs = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: 12 + rand() * 32,
      y: 12 + rand() * 76,
      color: i % 3 === 0 ? "#818cf8" : i % 3 === 1 ? "#6366f1" : "#4f46e5",
      group: "image",
    }));
    const txts = Array.from({ length: 30 }, (_, i) => ({
      id: i + 30,
      x: 58 + rand() * 30,
      y: 12 + rand() * 76,
      color: i % 3 === 0 ? "#f97316" : i % 3 === 1 ? "#ea580c" : "#fb923c",
      group: "text",
    }));
    return [...imgs, ...txts];
  }, []);

  return (
    <div className="relative h-[200px] p-3">
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <text x="28" y="8" fontSize="4" fill="#6366f1" textAnchor="middle" fontFamily="JetBrains Mono, monospace">image embeddings</text>
        <text x="73" y="8" fontSize="4" fill="#ea580c" textAnchor="middle" fontFamily="JetBrains Mono, monospace">text embeddings</text>
        <line x1="50" y1="5" x2="50" y2="95" stroke="#d8d4cb" strokeWidth="0.3" strokeDasharray="1,1" />
        {points.map((p) => (
          <circle
            key={p.id}
            cx={`${p.x}%`}
            cy={`${p.y}%`}
            r={hovered === p.id ? "2" : "1.4"}
            fill={p.color}
            opacity={hovered !== null && hovered !== p.id ? 0.3 : 0.75}
            style={{ cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={() => setHovered(p.id)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      <div className="absolute bottom-3 left-0 right-0 text-center text-[9px] text-[#8a8374]" style={MONO}>
        UMAP projection — modality gap visible as two separated clouds
      </div>
    </div>
  );
}

function SimilarityHeatmap() {
  const cells = [
    { label: "img × img", value: 0.82 },
    { label: "img → txt", value: 0.21 },
    { label: "txt → img", value: 0.19 },
    { label: "txt × txt", value: 0.79 },
  ];

  return (
    <div className="p-3 h-[170px] grid grid-cols-2 grid-rows-2 gap-[3px]">
      {cells.map((c) => (
        <div
          key={c.label}
          className="rounded-[4px] flex flex-col items-center justify-center gap-[2px]"
          style={{
            background: `rgba(79,70,229,${c.value})`,
            color: c.value > 0.5 ? "rgba(255,255,255,0.88)" : "#6d675c",
          }}
        >
          <span className="text-[9px] font-semibold" style={MONO}>
            {c.label}
          </span>
          <span className="text-[8px] opacity-80" style={MONO}>
            {c.value.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Diffusion Lens — layer-by-layer (NOT token-by-token) ───────────────────
// Toker et al. 2024 decode the FULL prompt representation at each text-encoder
// layer into an image. Per-token attribution is DAAM's job, not this tool's.

// Real Diffusion Lens outputs — SD 2.1 text encoder (OpenCLIP ViT-H/14, 24 layers)
// cumavg(k) = mean(hidden_states[1..k]) decoded through the SD 2.1 UNet
// Layers 13/18/23 show early→late cultural representation forming

const LENS_PROMPTS = [
  { id: "wedding_default",   label: "a wedding",              slug: "wedding_default"   },
  { id: "wedding_nigeria",   label: "a wedding in Nigeria",   slug: "wedding_nigeria"   },
  { id: "wedding_japan",     label: "a wedding in Japan",     slug: "wedding_japan"     },
  { id: "breakfast_default", label: "a breakfast",            slug: "breakfast_default" },
  { id: "breakfast_nigeria", label: "a breakfast in Nigeria", slug: "breakfast_nigeria" },
  { id: "breakfast_japan",   label: "a breakfast in Japan",   slug: "breakfast_japan"   },
];

const LENS_LAYERS = [13, 18, 23];
const LENS_LAYER_NOTES = [
  "layer 13 / 24 — mid-encoder, rough semantics forming",
  "layer 18 / 24 — late encoder, style and cultural content emerging",
  "layer 23 / 24 — final layer, what SD actually conditions on",
];

function DiffusionLens() {
  const [promptId, setPromptId] = useState(LENS_PROMPTS[0].id);
  const [layerIdx, setLayerIdx] = useState(2);

  const current = LENS_PROMPTS.find(p => p.id === promptId) ?? LENS_PROMPTS[0];

  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="flex gap-2 items-center">
        <span className="text-[9px] text-[#8a8374] shrink-0" style={MONO}>prompt:</span>
        <select
          value={promptId}
          onChange={(e) => { setPromptId(e.target.value); setLayerIdx(2); }}
          className="flex-1 text-[11px] border border-[#d8d4cb] rounded-[4px] px-2 py-[5px] bg-white focus:outline-none focus:border-[#818cf8] transition-colors"
          style={MONO}
        >
          {LENS_PROMPTS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>

      <p className="text-[11px] text-[#666] leading-[1.5]">
        The full prompt's representation pulled from the text encoder at three depths and decoded
        into an image — one prompt, three snapshots of it being understood. Click a layer.
      </p>

      {/* Layer strip — real images */}
      <div className="flex gap-[5px]">
        {LENS_LAYERS.map((layer, i) => (
          <button
            key={layer}
            onClick={() => setLayerIdx(i)}
            className="flex-1 flex flex-col gap-[4px] cursor-pointer bg-transparent border-0 p-0"
          >
            <img
              src={`/images/difflens/${current.slug}_layer${layer}.png`}
              alt={`layer ${layer}`}
              className="w-full rounded-[5px] object-cover transition-all duration-200"
              style={{
                aspectRatio: "1 / 1",
                outline: layerIdx === i ? "2px solid #818cf8" : "2px solid transparent",
                outlineOffset: "2px",
                opacity: layerIdx === i ? 1 : 0.6,
              }}
            />
            <span className="text-[8px] text-center transition-colors"
              style={{ ...MONO, color: layerIdx === i ? "#4f46e5" : "#8a8374" }}>
              layer {layer}
            </span>
          </button>
        ))}
      </div>

      <p className="text-[10px] font-medium" style={{ ...MONO, color: "#4f46e5" }}>
        {LENS_LAYER_NOTES[layerIdx]}
      </p>
    </div>
  );
}

export function Layer1() {
  return (
    <Section
      id="l1"
      badge={{ label: "Layer 1", variant: "l1" }}
      title="Architecture — why assumptions are possible"
      question="Why can't text fully control what gets generated?"
      explanation="Stable Diffusion joins a text encoder (CLIP) and an image denoiser (U-Net) that were trained separately. CLIP represents text and images in the same high-dimensional space, but images and text still cluster into two distinct regions — a phenomenon called the modality gap. This structural gap means that text-conditioned generation never fully overwrites the image prior already baked into the model's weights. Understanding this geometry is the first step toward understanding where hidden assumptions originate."
    >
      <PlanNote
        purpose="Show why text can't fully control generation: text and image embeddings sit in separate regions of CLIP space (the modality gap)."
        computed="CLIP embeddings of all prompts + images → cosine matrix (4 quadrants) + UMAP 2D. Diffusion Lens: full-prompt representation decoded per encoder layer, precomputed for a fixed prompt set."
        useful="Seeing the gap first makes every later failure read as a consequence, not a cherry-picked example."
        interaction="Hover points/cells for the underlying image or caption; pick a prompt and step through the encoder layers in the Lens."
      />
      <ToolsGrid cols={2}>
        <ToolCard
          num="01"
          name="UMAP scatter plot"
          type="Interactive"
          description="Image and text embeddings projected into 2D — two separated clouds make the modality gap visible without requiring the viewer to understand vector spaces."
          explanation="Each dot is a CLIP embedding: indigo for images from LAION, orange for their text captions. Despite being trained to align modalities, the two distributions never fully merge. The gap is not a bug — it is a structural feature of contrastive training — but it leaves room for the image prior to exert influence that the text embedding cannot cancel out."
        >
          <UMAPScatter />
        </ToolCard>

        <ToolCard
          num="02"
          name="4-quadrant cosine similarity heatmap"
          type="Static"
          description="Image×image, text×text, and cross-modal similarity blocks — the modality gap is legible as the low cross-modal blocks vs. high in-modal ones."
          explanation="In-modal similarity (top-left, bottom-right) is consistently high: images cluster with images, texts with texts. Cross-modal similarity (off-diagonal) is substantially lower. This asymmetry quantifies the gap: the text embedding of 'a doctor' is more similar to other text embeddings than it is to any image of a doctor — which limits how precisely a prompt can steer generation."
        >
          <SimilarityHeatmap />
        </ToolCard>

        <ToolCard
          num="03"
          name="Diffusion Lens — layer-by-layer prior assembly"
          type="Interactive"
          description="The full prompt's intermediate representation at each CLIP text-encoder layer, decoded back into an image — shows the prior assembling with depth. Layer-wise, not token-wise: per-token attribution is DAAM's job. (Toker et al. ACL 2024)"
          explanation="Early layers produce vague, generic imagery; objects, then composition, then style and demographic specifics appear as depth increases. The key observation: by the time the representation reaches the final layer — the only one SD ever sees — the model's default assumptions are already embedded in it. The assumption is finished before generation begins."
          fullWidth
        >
          <DiffusionLens />
        </ToolCard>
      </ToolsGrid>
    </Section>
  );
}
