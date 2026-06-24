import { useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import { Section, ToolCard, ToolsGrid, PlanNote } from "./ToolCard";

const MONO = { fontFamily: "'JetBrains Mono', monospace" };

// ─── Tool 13 — Timestep swap: attribute injection ───────────────────────────
// Start denoising with the bare prompt (A), at step k switch to the
// attribute-override prompt (B). If the output still shows A's default,
// the assumption was already locked in before step k.

const SWAP_PAIRS = [
  { base: "a doctor", override: "a female doctor", kind: "gender" },
  { base: "a nurse", override: "a male nurse", kind: "gender" },
  { base: "a wedding", override: "a wedding in Nigeria", kind: "culture" },
  { base: "a red car", override: "a blue car", kind: "attribute" },
];

// Per-pair curve data. Pairs 0,1,3 use placeholder demographic data (not yet generated).
// Pair 2 (culture) uses real data from lockup_curve.json — wedding Nigeria→USA,
// 12 seeds per swap point, 10k bootstrap CIs.
const PAIR_CURVES = [
  { // pair 0: a doctor → a female doctor (placeholder)
    k: [0, 4, 8, 12, 16, 20, 24],
    p:     [0.97, 0.91, 0.72, 0.48, 0.21, 0.07, 0.02],
    ci_lo: [0.84, 0.78, 0.59, 0.35, 0.08, 0.00, 0.00],
    ci_hi: [1.00, 1.00, 0.85, 0.61, 0.34, 0.14, 0.05],
    lockInIdx: 3, lockInLabel: "lock-in k≈12 (placeholder)",
  },
  { // pair 1: a nurse → a male nurse (placeholder)
    k: [0, 4, 8, 12, 16, 20, 24],
    p:     [0.97, 0.91, 0.72, 0.48, 0.21, 0.07, 0.02],
    ci_lo: [0.84, 0.78, 0.59, 0.35, 0.08, 0.00, 0.00],
    ci_hi: [1.00, 1.00, 0.85, 0.61, 0.34, 0.14, 0.05],
    lockInIdx: 3, lockInLabel: "lock-in k≈12 (placeholder)",
  },
  { // pair 2: a wedding → a wedding in Nigeria — REAL DATA (wedding_NG_to_US)
    // P(swap image resembles target culture | swap at step k), 12 seeds per point
    k: [1, 5, 10, 15, 25],
    p:     [1.000, 1.000, 0.333, 0.000, 0.000],
    ci_lo: [1.000, 1.000, 0.083, 0.000, 0.000],
    ci_hi: [1.000, 1.000, 0.583, 0.000, 0.000],
    lockInIdx: 1, lockInLabel: "lock-in k≈7–10",
  },
  { // pair 3: a red car → a blue car (placeholder)
    k: [0, 4, 8, 12, 16, 20, 24],
    p:     [0.97, 0.91, 0.72, 0.48, 0.21, 0.07, 0.02],
    ci_lo: [0.84, 0.78, 0.59, 0.35, 0.08, 0.00, 0.00],
    ci_hi: [1.00, 1.00, 0.85, 0.61, 0.34, 0.14, 0.05],
    lockInIdx: 3, lockInLabel: "lock-in k≈12 (placeholder)",
  },
];

// Legacy globals kept for the TimestepSlider frame-colour animation (pair 0 default)
const K_VALUES = PAIR_CURVES[0].k;
const LOCK_IN_IDX = PAIR_CURVES[0].lockInIdx;

const BASE_SHADES: [number, number, number][] = [
  [176, 192, 208],
  [200, 182, 182],
  [168, 178, 162],
  [178, 176, 198],
];
// override variants tinted toward a visibly different hue
const OVERRIDE_SHADES: [number, number, number][] = [
  [214, 178, 196],
  [172, 190, 210],
  [206, 182, 158],
  [206, 176, 188],
];

function blend(a: [number, number, number], b: [number, number, number], t: number) {
  return `rgb(${Math.round(a[0] * (1 - t) + b[0] * t)},${Math.round(a[1] * (1 - t) + b[1] * t)},${Math.round(a[2] * (1 - t) + b[2] * t)})`;
}

function LockInCurve({ pairIdx }: { pairIdx: number }) {
  const curve = PAIR_CURVES[pairIdx];
  const { k: kVals, p: probs, ci_lo, ci_hi, lockInIdx, lockInLabel } = curve;

  const w = 240;
  const h = 110;
  const n = kVals.length;
  const px = (i: number) => 18 + (i / (n - 1)) * (w - 34);
  const py = (p: number) => 12 + (1 - p) * (h - 34);

  const linePts  = probs.map((p, i) => `${px(i)},${py(p)}`).join(" ");
  const bandPts  = [
    ...probs.map((_, i) => `${px(i)},${py(Math.min(1, ci_hi[i]))}`),
    ...[...probs].reverse().map((_, i) => `${px(n - 1 - i)},${py(Math.max(0, ci_lo[n - 1 - i]))}`),
  ].join(" ");

  const isReal = pairIdx === 2;

  return (
    <div className="flex flex-col items-center">
      <svg width={w} height={h}>
        <polygon points={bandPts} fill="rgba(129,140,248,0.15)" />
        <line x1="18" y1={py(0.5)} x2={w - 16} y2={py(0.5)} stroke="#e0ddd6" strokeWidth="1" strokeDasharray="3,3" />
        <line x1={px(lockInIdx)} y1="10" x2={px(lockInIdx)} y2={h - 20} stroke="#ef4444" strokeWidth="1" strokeDasharray="2,2" />
        <polyline points={linePts} fill="none" stroke="#4f46e5" strokeWidth="1.5" />
        {probs.map((p, i) => (
          <circle key={i} cx={px(i)} cy={py(p)} r="2.4" fill="#4f46e5" />
        ))}
        {kVals.map((k, i) => (
          <text key={k} x={px(i)} y={h - 6} fontSize="7" fill="#8a8374" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
            {k}
          </text>
        ))}
        <text x={px(lockInIdx) + 4} y="16" fontSize="7" fill="#ef4444" fontFamily="JetBrains Mono, monospace">
          {lockInLabel}
        </text>
        <text x="14" y={py(0.5) - 3} fontSize="7" fill="#a39d8e" fontFamily="JetBrains Mono, monospace">
          50%
        </text>
      </svg>
      <span className="text-[8px] text-[#8a8374]" style={MONO}>
        P(override wins) vs swap step · 12 seeds per point{isReal ? " · real data" : " · placeholder"}
      </span>
    </div>
  );
}

function TimestepSlider() {
  const [pairIdx, setPairIdx] = useState(0);
  const [kIdx, setKIdx] = useState(2);

  const pair = SWAP_PAIRS[pairIdx];
  const baseShade = BASE_SHADES[pairIdx];
  const overrideShade = OVERRIDE_SHADES[pairIdx];
  const activeCurve = PAIR_CURVES[pairIdx];
  const activeKValues = activeCurve.k;
  const activeLockInIdx = activeCurve.lockInIdx;

  const getFrameColor = (i: number) => {
    if (i >= activeLockInIdx) return `rgb(${baseShade[0]},${baseShade[1]},${baseShade[2]})`;
    return blend(overrideShade, baseShade, i / activeLockInIdx);
  };

  return (
    <div className="p-4 flex flex-col gap-3">
      {/* Pair selector */}
      <div className="flex flex-wrap gap-[5px] items-center">
        <span className="text-[9px] text-[#8a8374]" style={MONO}>
          start with:
        </span>
        {SWAP_PAIRS.map((p, i) => (
          <button
            key={p.base}
            onClick={() => setPairIdx(i)}
            className="text-[10px] px-[8px] py-[3px] rounded-[4px] border transition-colors"
            style={{
              ...MONO,
              background: pairIdx === i ? "#7c2d12" : "#f5f4f0",
              color: pairIdx === i ? "#ffedd5" : "#666",
              borderColor: pairIdx === i ? "#7c2d12" : "#e0ddd6",
            }}
          >
            {p.base}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-[#666] leading-[1.5]">
        Denoising starts with <b>"{pair.base}"</b>. At step k we change the prompt to{" "}
        <b>"{pair.override}"</b> and keep going. If the output still shows the default{" "}
        <b>{pair.kind}</b>, the assumption was locked in before the change arrived — the same
        probe works for gender, culture, or any other attribute.
      </p>

      <div className="flex gap-5 items-start">
        {/* Left: single-seed strip + slider (illustration) */}
        <div className="flex-[3] flex flex-col gap-3">
          <div className="flex gap-[4px] items-end">
            {activeKValues.map((k, i) => (
              <div
                key={k}
                className="flex-1 rounded-[4px] flex flex-col items-center justify-end pb-[5px] relative transition-all duration-200"
                style={{
                  background: getFrameColor(i),
                  height: `${58 + (i < activeLockInIdx ? (activeLockInIdx - i) * 4 : 0)}px`,
                  opacity: i === kIdx ? 1 : 0.6,
                  outline: i === kIdx ? "2px solid #818cf8" : "none",
                  outlineOffset: "1px",
                }}
              >
                {i === activeLockInIdx && (
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
            max={activeKValues.length - 1}
            step={1}
            value={[kIdx]}
            onValueChange={([v]) => setKIdx(v)}
          >
            <Slider.Track className="relative h-[3px] flex-1 rounded-full" style={{ background: "#e0ddd6" }}>
              <Slider.Range className="absolute h-full rounded-full" style={{ background: "#818cf8" }} />
            </Slider.Track>
            <Slider.Thumb className="block w-4 h-4 rounded-full shadow-sm border" style={{ background: "#fff", borderColor: "#818cf8" }} />
          </Slider.Root>
          <p className="text-[9px] text-[#8a8374] text-center" style={MONO}>
            left of lock-in: "{pair.override}" still wins · right: too late, default locked · single seed, illustration only
          </p>
        </div>

        {/* Right: flip-probability curve (evidence) */}
        <div className="flex-[2] pt-1">
          <LockInCurve pairIdx={pairIdx} />
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
            <span className="text-[9px] text-[#8a8374] w-4 shrink-0" style={MONO}>
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
            <span className="text-[9px] text-[#867f6f] w-[28px] text-right shrink-0" style={MONO}>
              {r.sim.toFixed(2)}
            </span>
          </div>
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
              <span className="text-[8px] text-[#8a8374] self-center pl-2" style={MONO}>
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

// ─── Tool 16 — Prompt builder: slot-based probe ─────────────────────────────
// Same sentence structure, every slot swappable. Every combination is a
// precomputed batch of 50 — the user navigates data, not live inference.

const TEMPLATES = ["{occ}", "a {occ}", "a photo of a {occ}"];
const OCCS = ["doctor", "nurse", "CEO", "scientist"];
const OBJECTS = ["—", "a flower", "a sports car", "a minivan", "a family", "a microscope"];

// male-read per template per occupation (placeholder; format alone shifts the skew)
const TEMPLATE_BASE: Record<string, number[]> = {
  doctor:    [0.62, 0.68, 0.90],
  nurse:     [0.22, 0.14, 0.04],
  CEO:       [0.74, 0.82, 0.95],
  scientist: [0.66, 0.75, 0.88],
};

// male-read delta added by the object slot (placeholder)
const OBJECT_DELTA = [0, -0.14, 0.19, -0.19, -0.27, 0.08];

function clamp(v: number) {
  return Math.min(0.98, Math.max(0.02, v));
}

const slotSelect =
  "text-[11px] border border-[#c7c2b8] rounded-[4px] px-1 py-[3px] bg-[#fdfcf9] focus:outline-none focus:border-[#818cf8] transition-colors";

function PromptBuilder() {
  const [tIdx, setTIdx] = useState(1);
  const [occ, setOcc] = useState("doctor");
  const [objIdx, setObjIdx] = useState(0);

  const base = TEMPLATE_BASE[occ][tIdx];
  const value = clamp(base + OBJECT_DELTA[objIdx]);
  const sentence = TEMPLATES[tIdx].replace("{occ}", occ);

  return (
    <div className="p-3 flex flex-col gap-3">
      <p className="text-[12px] text-[#555] leading-[1.6]">
        None of these changes should matter. <i>"A photo of a doctor"</i> means the same as{" "}
        <i>"a doctor"</i>. A minivan says nothing about a person. For every combination we
        generated <b>50 images</b> — the bar shows <b>how many depict a man</b>. Watch how much
        meaning the model finds in changes that have none.
      </p>

      {/* The sentence with slots */}
      <div className="flex flex-wrap items-center gap-[6px] text-[13px] text-[#1a1a1a]" style={MONO}>
        <select value={tIdx} onChange={(e) => setTIdx(Number(e.target.value))} className={slotSelect} style={MONO}>
          <option value={0}>"___"</option>
          <option value={1}>"a ___"</option>
          <option value={2}>"a photo of a ___"</option>
        </select>
        <span className="text-[#a39d8e]">·</span>
        <select value={occ} onChange={(e) => setOcc(e.target.value)} className={slotSelect} style={MONO}>
          {OCCS.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <span className="text-[#a39d8e]">·</span>
        <span className="text-[11px] text-[#888]">next to</span>
        <select value={objIdx} onChange={(e) => setObjIdx(Number(e.target.value))} className={slotSelect} style={MONO}>
          {OBJECTS.map((o, i) => (
            <option key={o} value={i}>
              {o}
            </option>
          ))}
        </select>
        <span className="text-[9px] text-[#a39d8e]" style={MONO}>
          (optional)
        </span>
      </div>

      {/* Resulting prompt */}
      <div className="text-[12px] text-[#555]">
        prompt:{" "}
        <code className="bg-[#f5f4f0] px-[6px] py-[2px] rounded text-[11px]" style={MONO}>
          {sentence}
          {objIdx > 0 ? ` next to ${OBJECTS[objIdx]}` : ""}
        </code>
      </div>

      {/* Result bar */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-[#867f6f] w-[70px] text-right shrink-0" style={MONO}>
          men shown
        </span>
        <div className="flex-1 h-[14px] bg-[#f0ede6] rounded-[3px] overflow-hidden">
          <div
            className="h-full rounded-[3px]"
            style={{ width: `${value * 100}%`, background: "#4f46e5", transition: "width 0.5s ease" }}
          />
        </div>
        <span className="text-[10px] text-[#1a1a1a] font-semibold w-[64px] shrink-0" style={MONO}>
          {Math.round(value * 50)} / 50
        </span>
      </div>

      <p className="text-[9px] text-[#8a8374] leading-[1.5]" style={MONO}>
        every combination = a precomputed batch of 50 images · note: even the sentence format is
        a trigger — "a photo of a {occ}" skews harder than "{occ}" alone
      </p>
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
      explanation="Knowing that defaults exist is not enough — we need to know how structurally entrenched they are. The timestep experiment reveals when an assumption becomes irreversible. The masking experiment localizes where in the image it lives. The prompt builder shows that every word — even the sentence format itself — steers the outcome."
    >
      <PlanNote
        purpose="Measure how deep the assumptions go: when they lock in, where they live, how tight the output bubble is, and how every slot of the prompt steers them."
        computed="Lock-in: 2 pairs × 7 swap steps × 12 seeds → flip-probability curve. Masking: face vs. random blur, residual shift. Similarity: DINOv2 over 50 face crops. Builder: n=50 per slot combination."
        useful="Every effect has a control (random mask, multi-seed curve, matched objects) — findings, not anecdotes."
        interaction="Drag the swap slider; build prompts from slots; hover rows for the face crops behind each score."
      />
      <ToolsGrid cols={2}>
        <ToolCard
          num="13"
          name="Timestep swap — when the assumption locks in"
          type="Interactive slider + curve"
          description="Start denoising with a base prompt, switch to an override at step k — gender, culture, or color. The curve shows how often the override still wins (12 seeds per point); lock-in = the 50% crossing."
          explanation="The committed structure of the image — who is in it, whose culture frames it, what color things are — is decided in the first denoising steps, long before anything is recognizable. After the lock-in point, even an explicit override arrives too late. Lock-in is stochastic, so the result is a probability curve, not a single threshold; the strip shows one seed so the effect is visible."
          fullWidth
        >
          <TimestepSlider />
        </ToolCard>

        <ToolCard
          num="14"
          name="Intra-set similarity ranking"
          type="Ranked list"
          description="DINOv2 similarity averaged across 50 face crops per prompt — hover a row to see the faces behind the number."
          explanation="A high score means the model generates nearly the same face across all 50 seeds — the prior overwhelms seed-level variation. Computed on face crops to isolate demographics from background."
        >
          <SimilarityRanking />
        </ToolCard>

        <ToolCard
          num="15"
          name="Three-way masking — spatial localization"
          type="Image trio"
          description="Original / face blurred / random region blurred. The residual (face shift minus random shift) shows which region carries the assumption."
          explanation="Blurring anything shifts a CLIP embedding — that's why the random-region control exists. Only the residual counts: the face shifts the embedding far more than an equal random area, so the assumption is localized in the face."
        >
          <ThreeWayMask />
        </ToolCard>

        <ToolCard
          num="16"
          name="No neutral words — meaningless edits, measurable shifts"
          type="Interactive"
          description="Swap slots that carry no demographic meaning — the sentence format, a background object — and the distribution moves anyway. The point is not to build a prompt; it is that there is nothing neutral to build it from."
          explanation="Every slot here is semantically empty with respect to the person: 'a photo of a' adds no information, a minivan describes a car. Yet each swap shifts who appears, because the model reads every word through its learned associations. This is the project's claim in miniature: the prompt is never the whole input — it is always evaluated inside the model's worldview, and that worldview leaks through even the words that say nothing."
          fullWidth
        >
          <PromptBuilder />
        </ToolCard>
      </ToolsGrid>
    </Section>
  );
}
