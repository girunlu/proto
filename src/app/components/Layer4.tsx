import { useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import { Section, ToolCard, ToolsGrid, PlanNote } from "./ToolCard";

const MONO = { fontFamily: "'JetBrains Mono', monospace" };

// ─── Tool 13 — Timestep swap: strip (illustration) + curve (evidence) ──────

const SWAP_PROMPTS = ["a doctor", "a nurse", "a CEO", "an engineer", "a teacher", "a scientist"];
const K_VALUES = [0, 4, 8, 12, 16, 20, 24];

const PROMPT_SHADES: Record<string, [number, number, number]> = {
  "a doctor":    [176, 192, 208],
  "a nurse":     [200, 180, 180],
  "a CEO":       [168, 178, 162],
  "an engineer": [178, 176, 198],
  "a teacher":   [192, 184, 168],
  "a scientist": [174, 184, 196],
};

function blendShades(a: [number, number, number], b: [number, number, number], t: number) {
  return `rgb(${Math.round(a[0] * (1 - t) + b[0] * t)},${Math.round(a[1] * (1 - t) + b[1] * t)},${Math.round(a[2] * (1 - t) + b[2] * t)})`;
}

const LOCK_IN_IDX = 3; // lock-in at k=12 (placeholder)

// P(swap succeeds | swap at k) — placeholder sigmoid, 12 seeds per point
const FLIP_PROB = [0.97, 0.91, 0.72, 0.48, 0.21, 0.07, 0.02];
const FLIP_CI = 0.13; // placeholder CI half-width

function LockInCurve() {
  const w = 240;
  const h = 110;
  const px = (i: number) => 18 + (i / (K_VALUES.length - 1)) * (w - 34);
  const py = (p: number) => 12 + (1 - p) * (h - 34);

  const linePts = FLIP_PROB.map((p, i) => `${px(i)},${py(p)}`).join(" ");
  const bandPts = [
    ...FLIP_PROB.map((p, i) => `${px(i)},${py(Math.min(1, p + FLIP_CI))}`),
    ...[...FLIP_PROB].reverse().map((p, i) => `${px(FLIP_PROB.length - 1 - i)},${py(Math.max(0, p - FLIP_CI))}`),
  ].join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg width={w} height={h}>
        {/* CI band */}
        <polygon points={bandPts} fill="rgba(129,140,248,0.15)" />
        {/* 50% line */}
        <line x1="18" y1={py(0.5)} x2={w - 16} y2={py(0.5)} stroke="#e0ddd6" strokeWidth="1" strokeDasharray="3,3" />
        {/* lock-in marker */}
        <line x1={px(LOCK_IN_IDX)} y1="10" x2={px(LOCK_IN_IDX)} y2={h - 20} stroke="#ef4444" strokeWidth="1" strokeDasharray="2,2" />
        {/* curve */}
        <polyline points={linePts} fill="none" stroke="#4f46e5" strokeWidth="1.5" />
        {FLIP_PROB.map((p, i) => (
          <circle key={i} cx={px(i)} cy={py(p)} r="2.4" fill="#4f46e5" />
        ))}
        {/* axis labels */}
        {K_VALUES.map((k, i) => (
          <text key={k} x={px(i)} y={h - 6} fontSize="7" fill="#bbb" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
            {k}
          </text>
        ))}
        <text x={px(LOCK_IN_IDX) + 4} y="16" fontSize="7" fill="#ef4444" fontFamily="JetBrains Mono, monospace">
          lock-in k≈12 (CI 10–14)
        </text>
        <text x="14" y={py(0.5) - 3} fontSize="7" fill="#ccc" fontFamily="JetBrains Mono, monospace">
          50%
        </text>
      </svg>
      <span className="text-[8px] text-[#bbb]" style={MONO}>
        P(swap succeeds) vs swap step — 12 seeds per point · this curve is the evidence
      </span>
    </div>
  );
}

function TimestepSlider() {
  const [promptA, setPromptA] = useState("a doctor");
  const [promptB, setPromptB] = useState("a nurse");
  const [kIdx, setKIdx] = useState(2);

  const shadeA = PROMPT_SHADES[promptA];
  const shadeB = PROMPT_SHADES[promptB];

  const getFrameColor = (frameIdx: number) => {
    if (frameIdx >= LOCK_IN_IDX) return `rgb(${shadeA[0]},${shadeA[1]},${shadeA[2]})`;
    const t = frameIdx / LOCK_IN_IDX;
    return blendShades(shadeB, shadeA, t);
  };

  const selectClass =
    "text-[10px] border border-[#e0ddd6] rounded-[4px] px-2 py-[4px] bg-white focus:outline-none focus:border-[#818cf8] transition-colors appearance-none";

  return (
    <div className="p-4 flex flex-col gap-3">
      {/* Prompt selectors */}
      <div className="flex gap-3 items-end">
        <div className="flex flex-col gap-[5px] flex-1">
          <label className="text-[9px] text-[#aaa]" style={MONO}>
            Prompt A (start)
          </label>
          <select value={promptA} onChange={(e) => setPromptA(e.target.value)} className={selectClass} style={MONO}>
            {SWAP_PROMPTS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <span className="text-[18px] text-[#ccc] mb-[3px] select-none">→</span>
        <div className="flex flex-col gap-[5px] flex-1">
          <label className="text-[9px] text-[#aaa]" style={MONO}>
            Prompt B (swap target)
          </label>
          <select value={promptB} onChange={(e) => setPromptB(e.target.value)} className={selectClass} style={MONO}>
            {SWAP_PROMPTS.filter((p) => p !== promptA).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-5 items-start">
        {/* Left: single-seed strip + slider (illustration) */}
        <div className="flex-[3] flex flex-col gap-3">
          <div className="flex gap-[4px] items-end">
            {K_VALUES.map((k, i) => (
              <div
                key={k}
                className="flex-1 rounded-[4px] flex flex-col items-center justify-end pb-[5px] relative transition-all duration-200"
                style={{
                  background: getFrameColor(i),
                  height: `${58 + (i < LOCK_IN_IDX ? (LOCK_IN_IDX - i) * 4 : 0)}px`,
                  opacity: i === kIdx ? 1 : 0.6,
                  outline: i === kIdx ? "2px solid #818cf8" : "none",
                  outlineOffset: "1px",
                }}
              >
                {i === LOCK_IN_IDX && (
                  <span className="absolute -top-[16px] left-0 right-0 text-center text-[8px] text-[#ef4444]" style={MONO}>
                    lock-in ↓
                  </span>
                )}
                <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.7)", ...MONO }}>
                  k={k}
                </span>
              </div>
            ))}
          </div>
          <Slider.Root
            className="relative flex items-center select-none touch-none h-5"
            min={0}
            max={K_VALUES.length - 1}
            step={1}
            value={[kIdx]}
            onValueChange={([v]) => setKIdx(v)}
          >
            <Slider.Track className="relative h-[3px] flex-1 rounded-full" style={{ background: "#e0ddd6" }}>
              <Slider.Range className="absolute h-full rounded-full" style={{ background: "#818cf8" }} />
            </Slider.Track>
            <Slider.Thumb className="block w-4 h-4 rounded-full shadow-sm border" style={{ background: "#fff", borderColor: "#818cf8" }} />
          </Slider.Root>
          <p className="text-[9px] text-[#bbb] text-center" style={MONO}>
            single seed — illustration only · drag to see when the swap stops mattering
          </p>
        </div>

        {/* Right: flip-probability curve (evidence) */}
        <div className="flex-[2] pt-1">
          <LockInCurve />
        </div>
      </div>
    </div>
  );
}

// ─── Tool 14 — Similarity ranking with hover thumbnails ────────────────────

const RANKED_PROMPTS = [
  { rank: 1, label: "a CEO",       sim: 0.91, shades: ["#c8b8a8", "#c4b4a4", "#c8b8a8"] },
  { rank: 2, label: "a doctor",    sim: 0.84, shades: ["#c0b0a0", "#bca89a", "#c0ae9e"] },
  { rank: 3, label: "a scientist", sim: 0.76, shades: ["#c4beb8", "#c0bab4", "#c4beb8"] },
  { rank: 4, label: "a teacher",   sim: 0.68, shades: ["#c8c4c0", "#c4c0bc", "#c8c4c0"] },
];

function SimilarityRanking() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="p-3 flex flex-col gap-[8px] justify-center min-h-[140px]">
      {RANKED_PROMPTS.map((r) => (
        <div key={r.rank}>
          <div
            className="flex items-center gap-[8px] cursor-pointer rounded-[4px] px-1 py-[2px] transition-colors"
            style={{ background: hovered === r.rank ? "#f5f3ee" : "transparent" }}
            onMouseEnter={() => setHovered(r.rank)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="text-[9px] text-[#bbb] w-4 shrink-0" style={MONO}>
              {r.rank}
            </span>
            <div className="flex gap-[2px] shrink-0">
              {r.shades.map((s, i) => (
                <div key={i} className="w-[22px] h-[22px] rounded-[3px]" style={{ background: s }} />
              ))}
            </div>
            <span className="text-[9px] text-[#888] w-[72px] shrink-0" style={MONO}>
              {r.label}
            </span>
            <div className="flex-1 h-[6px] bg-[#f0ede6] rounded-[3px] overflow-hidden">
              <div
                className="h-full rounded-[3px]"
                style={{ width: `${r.sim * 100}%`, background: r.rank <= 2 ? "#f97316" : "#fdba74" }}
              />
            </div>
            <span className="text-[9px] text-[#aaa] w-[28px] text-right shrink-0" style={MONO}>
              {r.sim.toFixed(2)}
            </span>
          </div>
          {/* hover-to-reveal thumbnail strip */}
          {hovered === r.rank && (
            <div className="flex gap-[2px] pl-[34px] pt-[4px]">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className="w-[20px] h-[20px] rounded-[2px]"
                  style={{ background: r.shades[i % 3], opacity: 0.85 }}
                  title={`seed ${i}`}
                />
              ))}
              <span className="text-[8px] text-[#bbb] self-center pl-2" style={MONO}>
                …50 face crops behind this number
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Tool 15 — Three-way masking ────────────────────────────────────────────

function ThreeWayMask() {
  return (
    <div className="flex flex-col">
      <div className="flex gap-[6px] p-3 h-[130px]">
        <div className="flex-1 rounded-[5px] bg-[#c8c0b8] relative overflow-hidden">
          <span className="absolute bottom-[5px] left-0 right-0 text-center text-[8px] text-[#888]" style={MONO}>
            original
          </span>
        </div>
        <div className="flex-1 rounded-[5px] bg-[#c8c0b8] relative overflow-hidden">
          <div
            className="absolute rounded-[3px]"
            style={{
              top: "18%", left: "22%", width: "56%", height: "52%",
              background: "repeating-linear-gradient(0deg, rgba(240,236,228,0.92) 0px, rgba(240,236,228,0.92) 5px, rgba(220,214,204,0.92) 5px, rgba(220,214,204,0.92) 10px)",
              border: "1.5px solid rgba(255,255,255,0.7)",
            }}
          />
          <span className="absolute bottom-[5px] left-0 right-0 text-center text-[8px] text-[#888]" style={MONO}>
            face blur
          </span>
        </div>
        <div className="flex-1 rounded-[5px] bg-[#c8c0b8] relative overflow-hidden">
          <div
            className="absolute rounded-[2px]"
            style={{
              top: "8%", left: "52%", width: "36%", height: "34%",
              background: "repeating-linear-gradient(90deg, rgba(240,236,228,0.92) 0px, rgba(240,236,228,0.92) 5px, rgba(220,214,204,0.92) 5px, rgba(220,214,204,0.92) 10px)",
              border: "1.5px solid rgba(255,255,255,0.7)",
            }}
          />
          <span className="absolute bottom-[5px] left-0 right-0 text-center text-[8px] text-[#888]" style={MONO}>
            random blur
          </span>
        </div>
      </div>
      <div className="flex gap-5 px-4 pb-3 text-[10px] text-[#888]" style={MONO}>
        <span>face shift: <b className="text-[#1a1a1a] font-semibold">0.18</b></span>
        <span>random shift: <b className="text-[#1a1a1a] font-semibold">0.06</b></span>
        <span>residual: <b style={{ color: "#ef4444" }}>+0.12</b> — face region carries the assumption</span>
      </div>
    </div>
  );
}

// ─── Tool 16 — Concept bleed: predict-then-reveal ───────────────────────────

const BLEED_BASE = ["a doctor", "a nurse", "a CEO", "a scientist"];
const BLEED_OBJECTS = ["a flower", "a sports car", "a minivan", "a family", "a microscope"];

// baseline male-read + per-object male-read (placeholder values)
const BLEED_DATA: Record<string, { base: number; objects: number[] }> = {
  "a doctor":    { base: 0.68, objects: [0.54, 0.87, 0.49, 0.41, 0.76] },
  "a nurse":     { base: 0.14, objects: [0.08, 0.32, 0.07, 0.05, 0.18] },
  "a CEO":       { base: 0.82, objects: [0.69, 0.91, 0.66, 0.58, 0.86] },
  "a scientist": { base: 0.75, objects: [0.62, 0.83, 0.60, 0.52, 0.88] },
};

function ConceptBleed() {
  const [basePrompt, setBasePrompt] = useState("a doctor");
  const [objIdx, setObjIdx] = useState<number | null>(null);
  const [guess, setGuess] = useState<"up" | "down" | null>(null);

  const data = BLEED_DATA[basePrompt];
  const revealed = objIdx !== null && guess !== null;
  const actual = objIdx !== null ? data.objects[objIdx] : null;
  const delta = actual !== null ? Math.round((actual - data.base) * 100) : 0;
  const correct = revealed && ((delta > 0 && guess === "up") || (delta < 0 && guess === "down"));

  const reset = () => {
    setObjIdx(null);
    setGuess(null);
  };

  const chip = (active: boolean, activeBg: string, activeFg: string) => ({
    ...MONO,
    background: active ? activeBg : "#f5f4f0",
    color: active ? activeFg : "#666",
    borderColor: active ? activeBg : "#e0ddd6",
  });

  return (
    <div className="p-3 flex flex-col gap-3">
      {/* Step 1 — base prompt */}
      <div className="flex flex-wrap gap-[5px] items-center">
        <span className="text-[9px] text-[#bbb] w-[60px]" style={MONO}>1 · base:</span>
        {BLEED_BASE.map((p) => (
          <button
            key={p}
            onClick={() => { setBasePrompt(p); reset(); }}
            className="text-[10px] px-[8px] py-[3px] rounded-[4px] border transition-colors"
            style={chip(basePrompt === p, "#7c2d12", "#ffedd5")}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Baseline bar */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-[#aaa] w-[110px] text-right shrink-0" style={MONO}>
          {basePrompt} (alone)
        </span>
        <div className="flex-1 h-[13px] bg-[#f0ede6] rounded-[3px] overflow-hidden">
          <div className="h-full rounded-[3px]" style={{ width: `${data.base * 100}%`, background: "#818cf8" }} />
        </div>
        <span className="text-[9px] text-[#aaa] w-[40px] shrink-0" style={MONO}>
          {Math.round(data.base * 100)}% ♂
        </span>
      </div>

      {/* Step 2 — pick object */}
      <div className="flex flex-wrap gap-[5px] items-center">
        <span className="text-[9px] text-[#bbb] w-[60px]" style={MONO}>2 · add:</span>
        {BLEED_OBJECTS.map((o, i) => (
          <button
            key={o}
            onClick={() => { setObjIdx(i); setGuess(null); }}
            className="text-[10px] px-[8px] py-[3px] rounded-[4px] border transition-colors"
            style={chip(objIdx === i, "#1e3a5f", "#dbeafe")}
          >
            + next to {o}
          </button>
        ))}
      </div>

      {/* Step 3 — predict */}
      {objIdx !== null && guess === null && (
        <div className="flex items-center gap-2 pl-[60px]">
          <span className="text-[10px] text-[#555]" style={MONO}>
            your prediction — "{basePrompt} next to {BLEED_OBJECTS[objIdx]}" reads:
          </span>
          <button
            onClick={() => setGuess("up")}
            className="text-[10px] px-3 py-[3px] rounded-[4px] border border-[#e0ddd6] bg-white hover:border-[#818cf8] transition-colors"
            style={MONO}
          >
            more male ↑
          </button>
          <button
            onClick={() => setGuess("down")}
            className="text-[10px] px-3 py-[3px] rounded-[4px] border border-[#e0ddd6] bg-white hover:border-[#818cf8] transition-colors"
            style={MONO}
          >
            less male ↓
          </button>
        </div>
      )}

      {/* Reveal */}
      {revealed && actual !== null && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[#aaa] w-[110px] text-right shrink-0" style={MONO}>
              + {BLEED_OBJECTS[objIdx!]}
            </span>
            <div className="flex-1 h-[13px] bg-[#f0ede6] rounded-[3px] overflow-hidden">
              <div
                className="h-full rounded-[3px]"
                style={{ width: `${actual * 100}%`, background: "#4f46e5", transition: "width 0.7s ease" }}
              />
            </div>
            <span className="text-[9px] text-[#aaa] w-[40px] shrink-0" style={MONO}>
              {Math.round(actual * 100)}% ♂
            </span>
          </div>
          <p className="text-[10px] pl-[118px]" style={{ ...MONO, color: correct ? "#16a34a" : "#ef4444" }}>
            {delta > 0 ? `+${delta}` : delta} pp — {correct
              ? "you predicted it. You and the model share this association."
              : "the model surprised you. The object steered the person."}
            <button onClick={reset} className="ml-3 underline text-[#888] hover:text-[#1a1a1a]">try another</button>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Layer 4 export ─────────────────────────────────────────────────────────

export function Layer4() {
  return (
    <Section
      id="l4"
      badge={{ label: "Layer 4", variant: "l4" }}
      title="Depth — how locked in the assumptions are"
      question="How hard is it to escape?"
      explanation="Knowing that defaults exist is not enough — we need to know how structurally entrenched they are. This layer probes whether assumptions can be overridden and at what cost. The timestep experiment reveals when in the denoising process the prior locks in. The masking experiment localizes which spatial region carries the assumption. Concept bleed shows that even objects with no demographic meaning shift who gets generated — the assumptions are not lexically triggered but globally active."
    >
      <PlanNote
        purpose="Measure the depth of the assumptions: when they become irreversible (lock-in), where they live spatially (masking), how tight the output bubble is (similarity), and whether unrelated words can steer them (concept bleed — this work's novel probe)."
        computed="Lock-in: 2 prompt pairs × 7 swap points × 12 seeds, FairFace per image → flip-probability curve with bootstrap CI, lock-in point = 50% crossing. Masking: Gaussian blur on face vs. equal-area random region, CLIP re-embed, residual shift reported. Similarity: DINOv2 pairwise cosine over 50 face crops. Concept bleed: matched-category object pairs, n=50 per variant, pre-registered direction predictions."
        useful="This is where the article's claims become falsifiable: every effect here has a control (random mask, multi-seed curve, matched object pairs), which is what separates a finding from an anecdote."
        interaction="Drag the timestep slider to watch the swap stop mattering — the curve beside it carries the statistics. In concept bleed, you must commit to a prediction before the result is revealed; the surprise (or the lack of it) is the point. Hover similarity rows to see the 50 face crops behind each score."
      />
      <ToolsGrid cols={2}>
        <ToolCard
          num="13"
          name="Timestep swap — lock-in point"
          type="Interactive slider + curve"
          description="Denoises with Prompt A until step k, then swaps to Prompt B. Left: one seed as a visual strip. Right: the flip-probability curve over 12 seeds per swap point — the lock-in point is where it crosses 50%."
          explanation="Early timesteps establish global structure — composition, identity, demographic features. Later timesteps refine detail. Lock-in is stochastic: at intermediate steps the swap succeeds for some seeds and fails for others, so the honest result is a probability curve with a confidence interval, not a single threshold. The strip shows one seed so the phenomenon is visible; the curve makes it defensible."
          fullWidth
        >
          <TimestepSlider />
        </ToolCard>

        <ToolCard
          num="14"
          name="Intra-set similarity ranking"
          type="Ranked list"
          description="Pairwise DINOv2 cosine similarity averaged across 50 face-cropped images per prompt — hover a row to see the faces behind the number."
          explanation="A high intra-set similarity score means the model generates almost the same face across all 50 seeds — the prior is so strong it overwhelms seed-level variation. Computed on face crops to isolate demographic consistency from background variation. Hovering grounds the abstract score in the actual images."
        >
          <SimilarityRanking />
        </ToolCard>

        <ToolCard
          num="15"
          name="Three-way masking — spatial localization"
          type="Image trio"
          description="Original / face-region blurred / random-region blurred. The residual (face shift minus random shift) isolates which spatial region carries the assumption."
          explanation="Blurring anything shifts a CLIP embedding — that is why the random-region control exists. Only the residual is reported: if blurring the face shifts the embedding far more than blurring an equal random area, the demographic assumption is spatially localized in the face, not the clothing or background."
        >
          <ThreeWayMask />
        </ToolCard>

        <ToolCard
          num="16"
          name="Concept bleed — predict, then reveal"
          type="Interactive (guess first)"
          description="Pick a base prompt, add an object, and commit to a prediction before the distribution is revealed — the objects steer demographics without any demographic word in the prompt."
          explanation="Adding 'next to a sports car' or 'next to a family' shifts the gender-read of the person even though nothing demographic was said. The prediction step is deliberate: if you guess right, you've just demonstrated that you carry the same associations the model learned — which is the article's quietest and most uncomfortable finding."
          fullWidth
        >
          <ConceptBleed />
        </ToolCard>
      </ToolsGrid>
    </Section>
  );
}
