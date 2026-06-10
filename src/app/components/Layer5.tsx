import { useState } from "react";
import { Section, ToolCard, ToolsGrid, PlanNote } from "./ToolCard";

// ─── Tool 17 — Explicit override ────────────────────────────────────────────

function OverrideComparison() {
  return (
    <div className="p-3 flex flex-col gap-[10px] h-[120px] justify-center">
      {[
        { label: '"a doctor"', pct: 0.84, color: "#818cf8" },
        { label: '"a female doctor"', pct: 0.18, color: "#a5b4fc" },
      ].map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span
            className="text-[9px] text-[#aaa] w-[110px] text-right shrink-0"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {r.label}
          </span>
          <div className="flex-1 h-[13px] bg-[#f0ede6] rounded-[3px] overflow-hidden">
            <div className="h-full rounded-[3px]" style={{ width: `${r.pct * 100}%`, background: r.color }} />
          </div>
          <span className="text-[9px] text-[#aaa] w-[44px] shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {Math.round(r.pct * 100)}% ♂
          </span>
        </div>
      ))}
      <p className="text-[9px] text-[#bbb] pl-[118px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        works — but the burden of knowing what to override is on the user
      </p>
    </div>
  );
}

// ─── Tool 18 — Structured conditioning (ControlNet / GLIGEN) ───────────────

function StructuredConditioning() {
  return (
    <div className="p-3 flex flex-col gap-2">
      <div className="flex gap-3 items-center h-[120px]">
        <div className="flex-1 rounded-[5px] bg-[#d0c8c0] relative h-full">
          <div
            className="absolute top-[6px] left-[6px] text-[8px] text-[#888] bg-white/80 px-[5px] py-[1px] rounded"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            text only
          </div>
          <span
            className="absolute bottom-[5px] left-0 right-0 text-center text-[8px] text-[#aaa]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            attributes drift, layout random
          </span>
        </div>
        <span className="text-[18px] text-[#ccc] select-none">→</span>
        <div className="flex-1 rounded-[5px] bg-[#c0ccd4] relative h-full">
          {/* layout boxes overlay */}
          <div
            className="absolute border-[1.5px] border-dashed border-white/80 rounded-[3px]"
            style={{ top: "16%", left: "10%", width: "34%", height: "55%" }}
          />
          <div
            className="absolute border-[1.5px] border-dashed border-white/80 rounded-[3px]"
            style={{ top: "30%", left: "56%", width: "34%", height: "42%" }}
          />
          <div
            className="absolute top-[6px] left-[6px] text-[8px] text-[#888] bg-white/80 px-[5px] py-[1px] rounded"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            text + layout boxes
          </div>
          <span
            className="absolute bottom-[5px] left-0 right-0 text-center text-[8px] text-[#aaa]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            spatial structure enforced
          </span>
        </div>
      </div>
      <p className="text-[9px] text-[#bbb] text-center" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        GLIGEN / ControlNet inject structure the bag-of-words text encoder cannot express
      </p>
    </div>
  );
}

// ─── Tool 19 — Fair Diffusion steering ──────────────────────────────────────

function FairnessSteering() {
  const [strength, setStrength] = useState(0);
  const levels = [0, 1, 2, 3];
  const malePct = [0.84, 0.71, 0.58, 0.51][strength];
  return (
    <div className="p-3 flex flex-col gap-3 h-[120px] justify-center">
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-[#aaa] shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          fairness guidance:
        </span>
        {levels.map((l) => (
          <button
            key={l}
            onClick={() => setStrength(l)}
            className="text-[10px] px-[8px] py-[2px] rounded-[3px] border transition-colors"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: strength === l ? "#0c4a6e" : "#f5f4f0",
              color: strength === l ? "#e0f2fe" : "#666",
              borderColor: strength === l ? "#0c4a6e" : "#e0ddd6",
            }}
          >
            {l === 0 ? "off" : l}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-[#aaa] w-[70px] text-right shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          "a doctor"
        </span>
        <div className="flex-1 h-[13px] bg-[#f0ede6] rounded-[3px] overflow-hidden">
          <div
            className="h-full rounded-[3px] transition-all duration-500"
            style={{ width: `${malePct * 100}%`, background: "#0ea5e9" }}
          />
        </div>
        <span className="text-[9px] text-[#aaa] w-[44px] shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {Math.round(malePct * 100)}% ♂
        </span>
      </div>
      <p className="text-[9px] text-[#bbb]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        Fair Diffusion (Friedrich et al. 2023) — semantic steering toward parity at inference time
      </p>
    </div>
  );
}

// ─── Layer 5 export ─────────────────────────────────────────────────────────

export function Layer5() {
  return (
    <Section
      id="l5"
      badge={{ label: "Layer 5", variant: "l5" }}
      title="The escapes — what it takes to leave the bubble"
      question="If the assumptions are structural, can they be overridden at all?"
      explanation="The article cannot end with 'you are trapped.' This closing layer contrasts three escape routes, ordered by how much they demand of the user: explicit override (you must already know the assumption exists), structured conditioning (layout and pose injected outside the text channel), and inference-time fairness steering. Each works — partially — and each works by routing around the text encoder rather than fixing it, which is the final confirmation of the article's central claim."
    >
      <PlanNote
        purpose="Resolve the narrative: show that escapes exist, what they cost, and that all of them bypass — rather than repair — the text-conditioning path where the assumptions live."
        computed="Override: FairFace distributions for explicit-attribute variants (already in the main study manifest). Structured conditioning: qualitative image pairs generated with GLIGEN/ControlNet on 2–3 prompts. Fair Diffusion: distributions at 3 steering strengths for 2 occupations. All precomputed; small n, framed as demonstration, not finding."
        useful="Turns the article from diagnosis into understanding: a reader leaves knowing not just that defaults exist but why prompt-level fixes are fragile and structural fixes work."
        interaction="Toggle fairness-guidance strength and watch the distribution move toward parity; compare text-only vs. layout-conditioned pairs; hover bars for the underlying images."
      />
      <ToolsGrid cols={2}>
        <ToolCard
          num="17"
          name="Explicit override"
          type="Bar pair"
          description={`"a doctor" vs "a female doctor" — explicit attributes counteract the default, at the cost of requiring the user to know the default exists.`}
          explanation="Override works for the attribute that is named, but only that one — race, age, and aesthetic defaults remain untouched. And the user must anticipate the assumption to override it, which presumes exactly the awareness this explorable is trying to create."
        >
          <OverrideComparison />
        </ToolCard>

        <ToolCard
          num="18"
          name="Structured conditioning — GLIGEN / ControlNet"
          type="Image pair"
          description="The same prompt with and without layout conditioning — spatial structure injected outside the text channel succeeds where prompt wording cannot."
          explanation="ControlNet and GLIGEN bypass the bag-of-words bottleneck entirely: layout boxes, poses, and edge maps are injected directly into the U-Net. That this works is the strongest evidence that the failure lives in the text encoding, not in the image generator."
        >
          <StructuredConditioning />
        </ToolCard>

        <ToolCard
          num="19"
          name="Fairness steering — Fair Diffusion"
          type="Interactive"
          description="Inference-time semantic guidance pushes the demographic distribution toward parity — drag the strength up and watch the bar move."
          explanation="Fair Diffusion steers generation along learned demographic directions during denoising. It demonstrates that the assumption is a movable direction in the model's latent space — present by default, but not irreversible. The cost: someone must decide what the 'fair' target distribution is."
          fullWidth
        >
          <FairnessSteering />
        </ToolCard>
      </ToolsGrid>

      {/* Conclusion */}
      <div className="mt-12 max-w-[720px]">
        <h3
          className="text-[17px] font-medium text-[#1a1a1a] mb-3"
          style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
        >
          What to take with you
        </h3>
        <p className="text-[14px] text-[#555] leading-[1.75]">
          Every image you generate is a negotiation between what you asked for and what the model
          already believes. The assumptions are not bugs scattered through the system — they are
          the statistical center of its training data, encoded before your prompt arrives, locked
          in within the first denoising steps, and amplified by exactly the kind of rich,
          descriptive prompts real users write. You cannot prompt your way out of a default you
          cannot see. What you can do — now — is know where to look.
        </p>
      </div>
    </Section>
  );
}
