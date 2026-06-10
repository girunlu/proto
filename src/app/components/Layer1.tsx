import { useMemo, useState } from "react";
import { Section, ToolCard, ToolsGrid, PlanNote } from "./ToolCard";

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
        <text x="28" y="8" fontSize="4" fill="#818cf8" textAnchor="middle" fontFamily="JetBrains Mono, monospace" opacity="0.8">image embeddings</text>
        <text x="73" y="8" fontSize="4" fill="#f97316" textAnchor="middle" fontFamily="JetBrains Mono, monospace" opacity="0.8">text embeddings</text>
        <line x1="50" y1="5" x2="50" y2="95" stroke="#e0ddd6" strokeWidth="0.3" strokeDasharray="1,1" />
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
      <div
        className="absolute bottom-3 left-0 right-0 text-center text-[9px] text-[#bbb]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
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
            color: c.value > 0.5 ? "rgba(255,255,255,0.88)" : "#888",
          }}
        >
          <span className="text-[9px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {c.label}
          </span>
          <span className="text-[8px] opacity-70" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {c.value.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

const WORD_COLORS = ["#818cf8", "#f97316", "#34d399", "#f59e0b", "#ec4899", "#06b6d4", "#a78bfa", "#84cc16"];
const CLIP_LAYERS = [1, 4, 8, 11, 12];

// Free text input removed — the explorable serves only precomputed data (no live
// inference), so the prompt is picked from the set we actually generated.
const LENS_PROMPTS = [
  "a photo of a doctor",
  "a photo of a nurse",
  "a CEO at a board meeting",
  "a beautiful person",
  "a wedding",
  "a breakfast table",
  "a red car and a blue bicycle",
  "a doctor next to a sports car",
];

function DiffusionLens() {
  const [prompt, setPrompt] = useState(LENS_PROMPTS[0]);
  const [selectedWord, setSelectedWord] = useState<number | null>(null);

  const words = prompt.trim().split(/\s+/);

  const getGradient = (layerIdx: number) => {
    if (selectedWord === null) {
      const alpha = 0.25 + layerIdx * 0.17;
      return `linear-gradient(135deg, rgba(99,102,241,${alpha}), rgba(79,70,229,${alpha + 0.15}))`;
    }
    const hue = (selectedWord * 53 + layerIdx * 38) % 360;
    const alpha = 0.28 + (layerIdx / CLIP_LAYERS.length) * 0.45;
    return `linear-gradient(135deg, hsla(${hue},72%,62%,${alpha}), hsla(${(hue + 45) % 360},68%,44%,${alpha + 0.22}))`;
  };

  const getActivation = (layerIdx: number) => {
    if (selectedWord === null) return 18 + layerIdx * 14;
    return Math.min(95, 22 + (selectedWord * 13 + layerIdx * 19) % 60);
  };

  return (
    <div className="p-3 flex flex-col gap-3">
      {/* Prompt picker — precomputed set only */}
      <div className="flex gap-2 items-center">
        <span className="text-[9px] text-[#bbb] shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          prompt:
        </span>
        <select
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            setSelectedWord(null);
          }}
          className="flex-1 text-[11px] border border-[#e0ddd6] rounded-[4px] px-2 py-[5px] bg-white focus:outline-none focus:border-[#818cf8] transition-colors"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {LENS_PROMPTS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <span className="text-[9px] text-[#ccc] shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          precomputed
        </span>
      </div>

      {/* Word tokens */}
      <div className="flex flex-wrap gap-[5px] items-center">
        <span className="text-[9px] text-[#bbb]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          select token:
        </span>
        {words.map((w, i) => (
          <button
            key={i}
            onClick={() => setSelectedWord(selectedWord === i ? null : i)}
            className="text-[10px] px-2 py-[2px] rounded-[3px] transition-all duration-150"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: selectedWord === i ? WORD_COLORS[i % WORD_COLORS.length] : "#f0ede6",
              color: selectedWord === i ? "#fff" : "#555",
              border: `1px solid ${selectedWord === i ? WORD_COLORS[i % WORD_COLORS.length] : "#e0ddd6"}`,
            }}
          >
            {w}
          </button>
        ))}
        {selectedWord !== null && (
          <span className="text-[9px] text-[#bbb] ml-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            ← click to deselect
          </span>
        )}
      </div>

      {/* Layer image outputs */}
      <div className="flex gap-[5px]">
        {CLIP_LAYERS.map((layer, i) => (
          <div key={layer} className="flex-1 flex flex-col gap-[4px]">
            <div
              className="rounded-[5px] flex items-end justify-center pb-[6px]"
              style={{
                background: getGradient(i),
                height: "78px",
                transition: "background 0.35s ease",
              }}
            >
              <span
                className="text-[8px]"
                style={{ color: "rgba(255,255,255,0.72)", fontFamily: "'JetBrains Mono', monospace" }}
              >
                L{layer}
              </span>
            </div>
            {/* Token activation bar */}
            <div className="h-[3px] rounded-full bg-[#ede9e1] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-400"
                style={{
                  width: `${getActivation(i)}%`,
                  background: selectedWord !== null ? WORD_COLORS[selectedWord % WORD_COLORS.length] : "#818cf8",
                  transition: "width 0.4s ease, background 0.3s ease",
                }}
              />
            </div>
            <span
              className="text-[8px] text-[#bbb] text-center"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              layer {layer}
            </span>
          </div>
        ))}
      </div>
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
        purpose="Establish the mechanism first: text cannot fully control generation because text and image embeddings occupy structurally separated regions of CLIP space. Everything later in the article is a consequence of this gap."
        computed="OpenCLIP embeddings of all study prompts + mean image embeddings per prompt; L2-normalized; full cosine similarity matrix split into 4 quadrants; UMAP reduction to 2D. Diffusion Lens images decoded from intermediate text-encoder layers (Toker et al. ACL 2024), precomputed offline for a fixed prompt set."
        useful="A viewer who sees the two separated clouds before seeing any failure case reads the rest of the article as 'inevitable consequence' rather than 'cherry-picked anecdotes' — it front-loads the why."
        interaction="Hover any UMAP point to highlight it (final version: shows the image or caption behind it). Hover heatmap quadrants for the underlying pairs. Diffusion Lens: pick a precomputed prompt, click tokens to see how each word's concept assembles across encoder layers."
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
          description="Image×image, text×text, and cross-modal similarity blocks — the modality gap is legible as the low cross-modal diagonals vs. high in-modal ones."
          explanation="In-modal similarity (top-left, bottom-right) is consistently high: images cluster with images, texts with texts. Cross-modal similarity (off-diagonal) is substantially lower. This asymmetry quantifies the gap: the text embedding of 'a doctor' is more similar to other text embeddings than it is to any image of a doctor — which limits how precisely a prompt can steer generation."
        >
          <SimilarityHeatmap />
        </ToolCard>

        <ToolCard
          num="03"
          name="Diffusion Lens — token-layer attribution"
          type="Interactive"
          description="Intermediate CLIP text-encoder layer representations decoded back into image space — shows how the prior assembles concept by concept as signal propagates through the encoder. Prompt picked from the precomputed set. (Toker et al. ACL 2024)"
          explanation="Pick a prompt, then click any token to see how that word's semantic content builds across the 12 CLIP layers. Early layers capture low-level lexical properties; later layers encode high-level concepts like identity, occupation, and social role. The activation bar below each column shows the relative attention weight for the selected token at that layer depth."
          fullWidth
        >
          <DiffusionLens />
        </ToolCard>
      </ToolsGrid>
    </Section>
  );
}
