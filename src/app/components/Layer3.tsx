import { useState } from "react";
import { Section, ToolCard, ToolsGrid, SubsectionLabel, PlanNote } from "./ToolCard";

const MONO = { fontFamily: "'JetBrains Mono', monospace" };

// ─── Tool 07 — Distribution bars ────────────────────────────────────────────

const DEMO_PROMPTS = ["a doctor", "a CEO", "a nurse", "a professor", "a scientist"];
const DEMO_DATA: Record<string, { bare: number; contextual: number; override: number }> = {
  "a doctor":    { bare: 0.68, contextual: 0.91, override: 0.22 },
  "a CEO":       { bare: 0.82, contextual: 0.94, override: 0.18 },
  "a nurse":     { bare: 0.14, contextual: 0.08, override: 0.78 },
  "a professor": { bare: 0.72, contextual: 0.88, override: 0.31 },
  "a scientist": { bare: 0.75, contextual: 0.90, override: 0.28 },
};

function BarRow({ label, value, color, suffix }: { label: string; value: number; color: string; suffix?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-[#867f6f] w-[74px] text-right shrink-0" style={MONO}>
        {label}
      </span>
      <div className="flex-1 h-[13px] bg-[#f0ede6] rounded-[3px] overflow-hidden">
        <div
          className="h-full rounded-[3px] transition-all duration-500"
          style={{ width: `${value * 100}%`, background: color }}
        />
      </div>
      <span className="text-[9px] text-[#867f6f] w-[44px] shrink-0" style={MONO}>
        {suffix ?? `${Math.round(value * 100)}% ♂`}
      </span>
    </div>
  );
}

function DistributionBars() {
  const [selected, setSelected] = useState("a doctor");
  const d = DEMO_DATA[selected];
  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="flex flex-wrap gap-[5px]">
        {DEMO_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => setSelected(p)}
            className="text-[10px] px-[8px] py-[3px] rounded-[4px] border transition-colors"
            style={{
              ...MONO,
              background: selected === p ? "#4f46e5" : "#f5f4f0",
              color: selected === p ? "#fff" : "#666",
              borderColor: selected === p ? "#4f46e5" : "#e0ddd6",
            }}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-[7px]">
        <BarRow label="bare" value={d.bare} color="#818cf8" />
        <BarRow label="contextual" value={d.contextual} color="#4f46e5" />
        <BarRow label="override" value={d.override} color="#a5b4fc" />
      </div>
      <p className="text-[9px] text-[#8a8374] leading-[1.5]" style={MONO}>
        each bar = share of 50 images whose face reads as <b>male</b> (FairFace) · bare = no
        context · contextual = professional setting added · override = explicit gender added
      </p>
    </div>
  );
}

// ─── Tool 06 — Image batch with hover labels ───────────────────────────────

const BATCH_SHADES = [
  "#d4c8c0","#c8c0b8","#d0c8c0","#c4bcb4","#d4c8c0","#c8beb6","#d0c0b8","#c8c0ba",
  "#c8c0ba","#d0c8c2","#c4bcb6","#d4c8c2","#c8c0ba","#d0c8c0","#c4beb8","#d0c8c0",
];

// placeholder per-image FairFace labels — deterministic, mostly male to mirror "a doctor"
const BATCH_LABELS = BATCH_SHADES.map((_, i) => ({
  gender: i % 6 === 4 ? "female-read" : "male-read",
  race: i % 5 === 3 ? "east asian" : "white",
}));

function ImageBatch() {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="grid gap-[3px] h-[80px]" style={{ gridTemplateColumns: "repeat(8, 1fr)" }}>
        {BATCH_SHADES.map((s, i) => (
          <div
            key={i}
            className="rounded-[2px] cursor-pointer transition-all duration-100"
            style={{
              background: s,
              outline: hovered === i ? "2px solid #818cf8" : "none",
              outlineOffset: "1px",
              opacity: hovered !== null && hovered !== i ? 0.55 : 1,
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </div>
      <p className="text-[9px] h-[14px]" style={{ ...MONO, color: hovered !== null ? "#4f46e5" : "#a39d8e" }}>
        {hovered !== null
          ? `seed ${String(hovered).padStart(2, "0")} — FairFace: ${BATCH_LABELS[hovered].gender} · ${BATCH_LABELS[hovered].race}`
          : "hover a thumbnail to see its per-image FairFace label"}
      </p>
    </div>
  );
}

// ─── Tool 08 — Amplification delta (moved here from Layer 4) ───────────────

function AmplificationDelta() {
  const rows = [
    { label: "bare", pct: 0.65, color: "#fbbf24", delta: "reference" },
    { label: "contextual", pct: 0.91, color: "#f59e0b", delta: "+26 pp" },
    { label: "override", pct: 0.22, color: "#fcd34d", delta: "−43 pp" },
  ];
  return (
    <div className="p-3 flex flex-col gap-[10px] justify-center">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span className="text-[9px] text-[#867f6f] w-[70px] text-right shrink-0" style={MONO}>
            {r.label}
          </span>
          <div className="flex-1 h-[13px] bg-[#f0ede6] rounded-[3px] overflow-hidden">
            <div className="h-full rounded-[3px]" style={{ width: `${r.pct * 100}%`, background: r.color }} />
          </div>
          <span className="text-[9px] text-[#867f6f] w-[44px] shrink-0" style={MONO}>
            {Math.round(r.pct * 100)}% ♂
          </span>
          <span
            className="text-[9px] w-[64px] shrink-0 font-semibold"
            style={{ ...MONO, color: r.delta === "reference" ? "#a39d8e" : r.delta.startsWith("+") ? "#ef4444" : "#16a34a" }}
          >
            {r.delta}
          </span>
        </div>
      ))}
      <p className="text-[9px] text-[#8a8374] pl-[78px]" style={MONO}>
        both deltas vs. the same bare prompt — context amplifies the default for free; undoing it
        costs an explicit override
      </p>
    </div>
  );
}

// ─── Tool 09 — Cultural grid ────────────────────────────────────────────────

const CULTURAL_CONCEPTS = ["a wedding", "a breakfast table", "a school classroom"];
const CULTURAL_LOCATIONS = [
  { label: "default", shades: ["#d4cec8", "#cdc8c2", "#d0cbc5"] },
  { label: "in Nigeria", shades: ["#c8b8a0", "#c0b098", "#c4b4a2"] },
  { label: "in USA", shades: ["#d0ccc8", "#a39d8e8c4", "#cec8c4"] },
];

function CulturalGrid() {
  const [concept, setConcept] = useState(CULTURAL_CONCEPTS[0]);
  const conceptIdx = CULTURAL_CONCEPTS.indexOf(concept);

  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="flex gap-[5px] flex-wrap">
        {CULTURAL_CONCEPTS.map((c) => (
          <button
            key={c}
            onClick={() => setConcept(c)}
            className="text-[10px] px-[8px] py-[3px] rounded-[4px] border transition-colors"
            style={{
              ...MONO,
              background: concept === c ? "#064e3b" : "#f5f4f0",
              color: concept === c ? "#d1fae5" : "#666",
              borderColor: concept === c ? "#064e3b" : "#e0ddd6",
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex gap-[6px] h-[100px]">
        {CULTURAL_LOCATIONS.map((loc) => (
          <div key={loc.label} className="flex-1 flex flex-col gap-[4px]">
            <span
              className="text-[9px] text-[#555] text-center font-semibold bg-[#f0ede6] rounded-[3px] py-[2px]"
              style={MONO}
            >
              {loc.label}
            </span>
            <div className="flex-1 rounded-[4px] transition-colors duration-400" style={{ background: loc.shades[conceptIdx] }} />
            <div className="h-[18px] rounded-[4px] transition-colors duration-400" style={{ background: loc.shades[conceptIdx], opacity: 0.7 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tool 10 — Embedding distance bars ──────────────────────────────────────

const DISTANCE_DATA = [
  { country: "Nigeria", dist: 0.41, pct: 0.88 },
  { country: "India", dist: 0.28, pct: 0.60 },
  { country: "Brazil", dist: 0.19, pct: 0.41 },
  { country: "Germany", dist: 0.07, pct: 0.15 },
  { country: "USA", dist: 0.02, pct: 0.04 },
];

function EmbeddingDistanceBars() {
  return (
    <div className="p-3 flex flex-col gap-[8px] h-[140px] justify-center">
      {DISTANCE_DATA.map((d) => (
        <div key={d.country} className="flex items-center gap-2">
          <span className="text-[9px] text-[#867f6f] w-[56px] text-right shrink-0" style={MONO}>
            {d.country}
          </span>
          <div className="flex-1 h-[12px] bg-[#f0ede6] rounded-[3px] overflow-hidden">
            <div className="h-full rounded-[3px]" style={{ width: `${d.pct * 100}%`, background: "#34d399" }} />
          </div>
          <span className="text-[9px] text-[#867f6f] w-[28px]" style={MONO}>
            {d.dist.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Tool 11 — DAAM overlay ─────────────────────────────────────────────────

const DAAM_TOKENS = ["a", "red", "cube", "next", "to", "a", "blue", "sphere"];

const DAAM_MAPS: Record<string, { rgb: string; note: string; gradient: string }> = {
  red: {
    rgb: "239,68,68",
    note: '"red" leaks onto the sphere too — attribute not bound to the cube',
    gradient: "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.70) 38%, rgba(239,68,68,0.55) 80%, rgba(239,68,68,0.1) 100%)",
  },
  cube: {
    rgb: "245,158,11",
    note: '"cube" attends mostly to the left object — shape binding mostly works',
    gradient: "linear-gradient(135deg, rgba(245,158,11,0.65) 0%, rgba(245,158,11,0.5) 35%, rgba(245,158,11,0.06) 70%)",
  },
  blue: {
    rgb: "59,130,246",
    note: '"blue" splits across both objects — this is the bleed that recolors the cube',
    gradient: "linear-gradient(135deg, rgba(59,130,246,0.55) 0%, rgba(59,130,246,0.08) 55%, rgba(59,130,246,0.6) 100%)",
  },
  sphere: {
    rgb: "16,185,129",
    note: '"sphere" is localized right — but inherits whatever color won the fight',
    gradient: "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.12) 45%, rgba(16,185,129,0.6) 100%)",
  },
};

function DAAMOverlay() {
  const [token, setToken] = useState("red");
  const map = DAAM_MAPS[token];

  return (
    <div className="p-3 flex flex-col gap-2">
      {/* Word-by-word prompt — content tokens clickable */}
      <div className="flex flex-wrap gap-[4px] items-center">
        <span className="text-[9px] text-[#8a8374] mr-1" style={MONO}>
          prompt:
        </span>
        {DAAM_TOKENS.map((w, i) => {
          const clickable = w in DAAM_MAPS;
          const active = clickable && token === w;
          return (
            <button
              key={i}
              onClick={() => clickable && setToken(w)}
              disabled={!clickable}
              className="text-[10px] px-[7px] py-[2px] rounded-[3px] border transition-all"
              style={{
                ...MONO,
                background: active ? `rgb(${map.rgb})` : clickable ? "#f0ede6" : "transparent",
                color: active ? "#fff" : clickable ? "#555" : "#8a8374",
                borderColor: active ? `rgb(${map.rgb})` : clickable ? "#e0ddd6" : "transparent",
                cursor: clickable ? "pointer" : "default",
              }}
            >
              {w}
            </button>
          );
        })}
      </div>

      <div className="flex gap-[8px] h-[120px]">
        <div className="flex-1 rounded-[5px] bg-[#d0c8c0] relative">
          <span className="absolute bottom-[5px] left-0 right-0 text-center text-[8px] text-[#867f6f]" style={MONO}>
            generated image
          </span>
        </div>
        <div
          className="flex-1 rounded-[5px] border border-dashed border-[#f0ede6] relative transition-all duration-300"
          style={{ background: map.gradient }}
        >
          <span
            className="absolute bottom-[5px] left-0 right-0 text-center text-[8px]"
            style={{ color: `rgba(${map.rgb},0.95)`, ...MONO }}
          >
            heatmap: "{token}"
          </span>
        </div>
      </div>
      <p className="text-[9px] text-center transition-colors" style={{ ...MONO, color: `rgba(${map.rgb},0.85)` }}>
        {map.note}
      </p>
    </div>
  );
}

// ─── Tool 12 — Attention swap pair ──────────────────────────────────────────

function AttentionSwapPair() {
  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex gap-3 items-center h-[130px]">
        <div className="flex-1 rounded-[5px] bg-[#d0c8c0] relative h-full">
          <div className="absolute top-[6px] left-[6px] text-[8px] text-[#888] bg-white/80 px-[5px] py-[1px] rounded" style={MONO}>
            original failure
          </div>
          <span className="absolute bottom-[5px] left-0 right-0 text-center text-[8px] text-[#867f6f]" style={MONO}>
            before attention swap
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 text-[#a39d8e]">
          <span className="text-[18px] select-none">→</span>
          <span className="text-[8px] text-[#8a8374]" style={MONO}>P2P swap</span>
        </div>
        <div className="flex-1 rounded-[5px] bg-[#c0d0bc] relative h-full">
          <div className="absolute top-[6px] left-[6px] text-[8px] text-[#888] bg-white/80 px-[5px] py-[1px] rounded" style={MONO}>
            corrected output
          </div>
          <span className="absolute bottom-[5px] left-0 right-0 text-center text-[8px] text-[#867f6f]" style={MONO}>
            after attention swap
          </span>
        </div>
      </div>
      <p className="text-[9px] text-[#8a8374] text-center" style={MONO}>
        only the cross-attention maps are swapped — spatial layout and identity preserved
      </p>
    </div>
  );
}

export function Layer3() {
  return (
    <Section
      id="l3"
      badge={{ label: "Layer 3", variant: "l3a" }}
      title="The defaults — what the assumptions look like"
      question="What does SD assume when you leave attributes unspecified?"
      explanation="Once we know that assumptions are structurally possible (Layer 1) and that a prior exists to fill that space (Layer 2), we can ask what that prior actually contains. This layer presents three categories of default: demographic assumptions about who a person is, cultural assumptions about what everyday scenes look like, and compositional failures where attributes leak between objects through cross-attention."
    >
      <PlanNote
        purpose="Show what the defaults contain: who the doctor is, whose wedding 'a wedding' is, where adjectives actually land."
        computed="50 images per prompt → FairFace distributions + bootstrap CIs; amplification delta = contextual − bare; cultural distance via DINOv2; DAAM heatmaps + attention swap."
        useful="Every claim is backed by a visible batch — the viewer can check the statistics against the images."
        interaction="Chips switch prompts; hover thumbnails for per-image labels; click DAAM tokens to switch overlays."
      />

      <SubsectionLabel
        explanation="When a prompt names a profession or social role without specifying demographics, SD fills in gender and race from its training distribution. These defaults are not random — they reflect and amplify the statistical biases of internet-scale image datasets. Adding professional context (e.g. 'in a hospital') typically makes the skew stronger, not weaker."
      >
        3a — Demographic defaults
      </SubsectionLabel>
      <ToolsGrid cols={2}>
        <ToolCard
          num="06"
          name="Image batch — 50 images per prompt"
          type="Interactive grid"
          description="50 images at fixed seeds, DDIM, SD 2.1 — the raw distribution the FairFace classifier runs on. Hover any thumbnail for its per-image label."
          explanation="Generating 50 images per prompt at deterministic seeds produces a distribution that can be statistically characterized. Individual images may vary, but the aggregate reveals the model's systematic tendencies. Hovering grounds every aggregate number in a concrete image — the viewer can verify the classifier's reading against their own."
        >
          <ImageBatch />
        </ToolCard>

        <ToolCard
          num="07"
          name="Gender distribution — bare / contextual / override"
          type="Interactive chart"
          description="FairFace gender-read percentages for each prompt variant, with bootstrap CIs in the final version."
          explanation="Select a prompt to see how its gender distribution shifts across three conditions. 'Bare' uses the occupation term alone. 'Contextual' adds a professional setting. 'Override' adds an explicit gender term. The gap between bare and contextual reveals how social context amplifies rather than suppresses the model's defaults."
        >
          <DistributionBars />
        </ToolCard>

        <ToolCard
          num="08"
          name="Amplification vs. override — two deltas, one prompt"
          type="Derived metric"
          description="Both variants measured against the same bare prompt: realistic context pushes the skew up (+26 pp); an explicit gender term is needed to push it down (−43 pp)."
          explanation="The bare prompt is the reference, so its own delta is zero — the comparison that matters is what each modification does to it. Adding realistic context amplifies the default without any demographic word. Undoing the default requires naming it explicitly. The asymmetry is the finding: bias comes free, correction costs intent."
        >
          <AmplificationDelta />
        </ToolCard>
      </ToolsGrid>

      <SubsectionLabel
        explanation="Cultural defaults are harder to see than demographic ones because they often feel like neutral design choices — a particular kitchen layout, a particular wedding dress style. But these choices encode a specific cultural vantage point that becomes visible as soon as you add geographic context to the same prompt."
      >
        3b — Cultural defaults
      </SubsectionLabel>
      <ToolsGrid cols={2}>
        <ToolCard
          num="09"
          name="Side-by-side cultural image grids"
          type="Interactive grid"
          description="Same concept in default / Nigeria / USA — select a concept to compare how SD's visual vocabulary shifts across geographic contexts."
          explanation="The default outputs reveal SD's implicit cultural baseline. Adding 'in Nigeria' or 'in India' produces dramatically different compositions, color palettes, and material cultures — not because the model lacks that knowledge, but because it treats one cultural perspective as the unmarked default. The near-identical 'in USA' column shows the US is already the implicit default."
        >
          <CulturalGrid />
        </ToolCard>

        <ToolCard
          num="10"
          name="Distance from the default"
          type="Bar chart"
          description="Distance between mean embeddings of default vs. each geographic variant — DINOv2 as the primary (CLIP-independent) measure, CLIP distance as supporting signal."
          explanation="Small distances mean adding a geographic qualifier changes almost nothing — that geography is already the default. Large distances measure how far the model must travel to represent that culture. Measured with DINOv2 to avoid the circularity of judging CLIP's bias with CLIP itself."
        >
          <EmbeddingDistanceBars />
        </ToolCard>
      </ToolsGrid>

      <SubsectionLabel
        explanation="Compositional failures occur when attributes specified for one object bleed into another through the cross-attention mechanism. This is a lower-level failure than demographic bias — not about who the model imagines people to be, but about how it binds adjectives to nouns during denoising."
      >
        3c — Compositional failures
      </SubsectionLabel>
      <ToolsGrid cols={2}>
        <ToolCard
          num="11"
          name="DAAM cross-attention heatmap overlays"
          type="Interactive overlay"
          description="Per-token pixel attribution aggregated across all U-Net layers and timesteps — click a token to see which pixels it actually controlled."
          explanation="DAAM integrates cross-attention maps across all timesteps and U-Net layers into a per-token saliency map. When attribute binding fails, the heatmap for a color token spreads over the wrong object. The visualization makes the failure mechanistically transparent: the model has the right information but routes it incorrectly."
        >
          <DAAMOverlay />
        </ToolCard>

        <ToolCard
          num="12"
          name="Causal attribution — attention swap pair"
          type="Image pair"
          description="Original compositional failure alongside the corrected output after forcing cross-attention maps to swap mid-generation via Prompt-to-Prompt — proves attention routing is the causal mechanism."
          explanation="Swapping only the cross-attention maps — while keeping noise, timestep schedule, and weights constant — is sufficient to correct the failure. This rules out confounds in the denoising trajectory: the attention map is not just correlated with the failure; it causes it."
        >
          <AttentionSwapPair />
        </ToolCard>
      </ToolsGrid>
    </Section>
  );
}
