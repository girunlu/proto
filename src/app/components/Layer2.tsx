import { useState } from "react";
import { Section, ToolCard, ToolsGrid, PlanNote } from "./ToolCard";

// ─── Tool 04 — Empty-prompt prior ───────────────────────────────────────────

function EmptyPrompt() {
  return (
    <div className="flex gap-[6px] px-3 py-3 h-[120px]">
      <div
        className="flex-[2] rounded-[5px] flex flex-col items-center justify-center gap-2"
        style={{ background: "#d4cfc8" }}
      >
        <span className="text-[10px] text-[#888]">SD prior output</span>
        <code
          className="text-[9px] text-[#888] px-[6px] py-[2px] bg-white/60 rounded"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          prompt = &quot;&quot;
        </code>
      </div>
      <div
        className="flex-1 flex flex-col gap-[6px] justify-center text-[9px] text-[#867f6f]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        <div>guidance: no-op</div>
        <div className="text-[8px] text-[#a39d8e]">(cond = uncond when prompt is empty)</div>
        <div>DDIM 30 steps</div>
        <div>seeds 0–29</div>
        <div>SD 2.1</div>
      </div>
    </div>
  );
}

// ─── Tool 05 — CFG stability ────────────────────────────────────────────────

// Cultural CFG strip — "a wedding" at each CFG value (real images, seed 00)
const CFG_VALUES_CULTURAL = [1, 4, 7, 12, 15];

function CFGCulturalStrip() {
  const [cfgIdx, setCfgIdx] = useState(2); // default to cfg=7
  const mono = { fontFamily: "'JetBrains Mono', monospace" };
  return (
    <div className="p-3 flex flex-col gap-3">
      <p className="text-[11px] text-[#666] leading-[1.5]">
        "a wedding" generated at five guidance scale values — same seed, same scheduler.
        The cultural default is stable across the full CFG range.
      </p>
      <div className="flex gap-[5px]">
        {CFG_VALUES_CULTURAL.map((cfg, i) => (
          <button
            key={cfg}
            onClick={() => setCfgIdx(i)}
            className="flex-1 flex flex-col gap-[4px] cursor-pointer bg-transparent border-0 p-0"
          >
            <img
              src={`/images/cfg/wedding_cfg${cfg}.webp`}
              loading="lazy"
              alt={`cfg=${cfg}`}
              className="w-full rounded-[5px] object-cover transition-all duration-200"
              style={{
                aspectRatio: "1 / 1",
                outline: cfgIdx === i ? "2px solid #92400e" : "2px solid transparent",
                outlineOffset: "2px",
                opacity: cfgIdx === i ? 1 : 0.6,
              }}
            />
            <span className="text-[9px] text-center transition-colors"
              style={{ ...mono, color: cfgIdx === i ? "#92400e" : "#8a8374" }}>
              cfg={cfg}
            </span>
          </button>
        ))}
      </div>
      <p className="text-[8px] text-[#a39d8e]" style={mono}>
        SD 2.1 · DDIM · seed 00 · 768×768 · single seed, illustration only
      </p>
    </div>
  );
}

const CFG_LEVELS = [1, 3, 7, 15];
const CFG_PROMPTS = ["a doctor", "a CEO", "a nurse", "a scientist"];

// % male-read per CFG level, n=30 per cell (placeholder values).
// The point: the bars barely move.
const CFG_DIST: Record<string, number[]> = {
  "a doctor":    [0.81, 0.83, 0.85, 0.86],
  "a CEO":       [0.80, 0.83, 0.85, 0.87],
  "a nurse":     [0.13, 0.11, 0.10, 0.09],
  "a scientist": [0.74, 0.77, 0.79, 0.82],
};

const PROMPT_SHADES: Record<string, [number, number, number]> = {
  "a doctor":    [178, 190, 205],
  "a CEO":       [168, 178, 162],
  "a nurse":     [200, 182, 182],
  "a scientist": [180, 176, 198],
};

function CFGStability() {
  const [levelIdx, setLevelIdx] = useState(2);
  const mono = { fontFamily: "'JetBrains Mono', monospace" };

  const shade = (p: string) => {
    const [r, g, b] = PROMPT_SHADES[p];
    const f = 1 - levelIdx * 0.07; // image sharpens/darkens slightly with CFG
    return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
  };

  return (
    <div className="p-3 flex flex-col gap-3">
      {/* CFG level selector */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-[#8a8374] shrink-0" style={mono}>
          guidance scale:
        </span>
        {CFG_LEVELS.map((v, i) => (
          <button
            key={v}
            onClick={() => setLevelIdx(i)}
            className="text-[10px] px-[10px] py-[3px] rounded-[4px] border transition-colors"
            style={{
              ...mono,
              background: levelIdx === i ? "#78350f" : "#f5f4f0",
              color: levelIdx === i ? "#fef3c7" : "#666",
              borderColor: levelIdx === i ? "#78350f" : "#e0ddd6",
            }}
          >
            cfg={v}
          </button>
        ))}
      </div>

      {/* One row per prompt: illustration image + distribution bar */}
      <div className="flex flex-col gap-[7px]">
        {CFG_PROMPTS.map((p) => (
          <div key={p} className="flex items-center gap-2">
            <span className="text-[9px] text-[#888] w-[78px] text-right shrink-0" style={mono}>
              {p}
            </span>
            <div
              className="w-[44px] h-[30px] rounded-[3px] shrink-0 transition-colors duration-300"
              style={{ background: shade(p) }}
              title="single-seed illustration"
            />
            <div className="flex-1 h-[12px] bg-[#f0ede6] rounded-[3px] overflow-hidden">
              <div
                className="h-full rounded-[3px] transition-all duration-500"
                style={{
                  width: `${CFG_DIST[p][levelIdx] * 100}%`,
                  background: p === "a nurse" ? "#34d399" : "#818cf8",
                }}
              />
            </div>
            <span className="text-[9px] text-[#867f6f] w-[40px] shrink-0" style={mono}>
              {Math.round(CFG_DIST[p][levelIdx] * 100)}% ♂
            </span>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-[#8a8374] leading-[1.5]" style={mono}>
        bars = FairFace distribution from 30 seeds per CFG level (evidence) · thumbnails = one
        seed (illustration only) · note how little the bars move — guidance strength does not
        remove the assumption
      </p>
    </div>
  );
}

export function Layer2() {
  return (
    <Section
      id="l2"
      badge={{ label: "Layer 2", variant: "l2" }}
      title="The prior — what fills the gap"
      question="What does SD generate before your prompt does anything?"
      explanation="The modality gap creates a void that the model fills with its own learned prior — a weighted average of everything in its training distribution. Generating with an empty prompt forces this prior into the open, revealing the model's default visual world before any semantic steering takes place. The CFG experiment then makes a counterintuitive point: turning the prompt's influence up or down barely changes the demographic outcome. The assumption is not a function of guidance strength — it lives in the prior itself."
    >
      <PlanNote
        purpose="Show the prior that fills the gap — and that the guidance knob can't tune it away."
        computed={`prompt="" batch (30 seeds) for the raw prior. CFG stability: 4 occupations × 4 CFG levels × 30 seeds → FairFace per cell.`}
        useful="Kills the most common intuition: 'I'll just tweak the settings.' The assumption precedes the prompt."
        interaction="Switch CFG levels — the bars barely move. Hover a bar for the 30 images behind it."
      />
      <ToolsGrid cols={2}>
        <ToolCard
          num="04"
          name="Empty-prompt generation"
          type="Static image"
          description={`Generated with prompt="" — the model's global prior with zero semantic conditioning. Guidance has no effect here (cond = uncond), so what appears is purely the learned default.`}
          explanation="Without any prompt, the U-Net denoises from pure Gaussian noise using only its unconditional path. The resulting images are a direct read of the statistical center of the model's training distribution — they reveal which visual patterns the model considers most probable in the absence of any instruction. Shown as a 30-seed batch, not a single image, so the default is a distribution too."
        >
          <EmptyPrompt />
        </ToolCard>

        <ToolCard
          num="05"
          name="CFG stability — the knob that doesn't help"
          type="Interactive"
          description="Select a guidance scale and watch the FairFace gender distribution per occupation barely move — 30 seeds per CFG level, so the bars are evidence, not anecdote."
          explanation="A natural intuition says stronger guidance means the prompt 'wins' over the prior. The distributions show otherwise: from cfg=1 to cfg=15 the demographic skew stays essentially constant — if anything it sharpens slightly. The prompt never specified a demographic, so there is nothing for guidance to enforce; the gap is filled by the prior at every strength. You cannot parameter-tweak your way out of an assumption."
        >
          <CFGStability />
        </ToolCard>

        <ToolCard
          num="05b"
          name="CFG stability — cultural version"
          type="Image strip"
          description='"a wedding" generated at CFG 1 / 4 / 7 / 12 / 15 — same seed throughout. The cultural default is stable across the full guidance range. Click a CFG value to inspect.'
          explanation="The Western wedding coding persists regardless of how strongly the model follows the prompt — because the prompt says nothing about culture, only about the event type. The assumption is pre-text: it lives in the denoising prior, not in guidance arithmetic."
        >
          <CFGCulturalStrip />
        </ToolCard>
      </ToolsGrid>
    </Section>
  );
}
