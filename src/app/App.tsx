import { useState, useEffect } from "react";
import { Layer1 } from "./components/Layer1";
import { Layer2 } from "./components/Layer2";
import { Layer3 } from "./components/Layer3";
import { Layer4 } from "./components/Layer4";
import { Layer5 } from "./components/Layer5";
import { Methods } from "./components/Methods";

const NAV_LINKS = [
  { href: "#l1", label: "Architecture" },
  { href: "#l2", label: "Prior" },
  { href: "#l3", label: "Defaults" },
  { href: "#l4", label: "Depth" },
  { href: "#l5", label: "Escapes" },
  { href: "#methods", label: "Methods" },
];

function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className="sticky top-0 z-50 bg-white border-b border-[#e0ddd6] flex items-center justify-between px-12 transition-shadow"
      style={{
        height: "56px",
        boxShadow: scrolled ? "0 1px 8px rgba(0,0,0,0.06)" : "none",
      }}
    >
      <span
        className="text-[13px] font-medium text-[#1a1a1a] tracking-[0.01em]"
        style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
      >
        Hidden Assumptions in Stable Diffusion
      </span>
      <div className="flex gap-8">
        {NAV_LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="text-[12px] text-[#666] no-underline hover:text-[#1a1a1a] transition-colors"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <div className="bg-white border-b border-[#e0ddd6] px-12 pt-20 pb-16 flex gap-12 flex-wrap items-start">
      <div className="max-w-[640px]">
        <div
          className="text-[11px] font-medium tracking-[0.08em] uppercase text-[#888] mb-5"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Interactive Explorable · SD 2.1 · XAI
        </div>
        <h1
          className="text-[42px] font-normal leading-[1.15] text-[#1a1a1a] mb-5"
          style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
        >
          What does Stable Diffusion
          <br />
          <em className="italic text-[#555]">assume</em> before you say anything?
        </h1>
        <div
          className="flex flex-col gap-[6px] mb-6 text-[14px]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <span className="text-[#a39d8e]">
            what you think happens:&nbsp;&nbsp;
            <span className="line-through decoration-[#ef4444]/60">image = f( prompt )</span>
          </span>
          <span className="text-[#1a1a1a]">
            what actually happens:&nbsp;&nbsp;&nbsp;image ~ P( · | prompt, <b className="text-[#4f46e5]">the model's worldview</b> )
          </span>
        </div>
        <p className="text-[16px] leading-[1.7] text-[#555]">
          Your prompt is never the whole input. It is read inside a worldview the model learned
          before you arrived — decisions about who a person looks like, which culture is the
          default, and what "realistic" means. You can't see that second condition, and you can't
          opt out of it. This explorable makes it visible: where it lives, when it locks in, and
          what it costs to override.
        </p>
      </div>
      <img
        src="/images/hero/cover.webp"
        alt=""
        className="flex-1 min-w-[420px] max-w-[680px] rounded-[8px] object-cover self-stretch"
        style={{ aspectRatio: "3 / 2" }}
      />
    </div>
  );
}

function PredictOpener() {
  const [guess, setGuess] = useState<string | null>(null);
  const options = ["mostly men", "roughly balanced", "mostly women"];
  const mono = { fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div className="bg-white border-b border-[#e0ddd6] px-12 py-12">
      <div className="max-w-[640px]">
        <div className="text-[11px] font-medium tracking-[0.08em] uppercase text-[#888] mb-4" style={mono}>
          Before we explain anything — make a guess
        </div>
        <p className="text-[16px] leading-[1.7] text-[#333] mb-5">
          We asked Stable Diffusion for{" "}
          <code className="text-[14px] bg-[#f5f4f0] px-[6px] py-[2px] rounded" style={mono}>
            "a doctor"
          </code>{" "}
          — 50 times, 50 different random starting points, nothing else specified. Who shows up?
        </p>
        <div className="flex gap-2 mb-5">
          {options.map((o) => (
            <button
              key={o}
              onClick={() => setGuess(o)}
              disabled={guess !== null}
              className="text-[12px] px-4 py-[7px] rounded-[5px] border transition-colors"
              style={{
                ...mono,
                background: guess === o ? "#4f46e5" : "#f5f4f0",
                color: guess === o ? "#fff" : guess !== null ? "#8a8374" : "#555",
                borderColor: guess === o ? "#4f46e5" : "#e0ddd6",
                cursor: guess === null ? "pointer" : "default",
              }}
            >
              {o}
            </button>
          ))}
        </div>
        {guess && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#867f6f] w-[80px] text-right shrink-0" style={mono}>
                male-read
              </span>
              <div className="flex-1 h-[16px] bg-[#f0ede6] rounded-[4px] overflow-hidden">
                <div
                  className="h-full rounded-[4px]"
                  style={{ width: "84%", background: "#4f46e5", transition: "width 0.8s ease" }}
                />
              </div>
              <span className="text-[11px] text-[#1a1a1a] font-semibold w-[36px]" style={mono}>
                84%
              </span>
            </div>
            <p className="text-[13px] leading-[1.65] text-[#666]">
              84% male-read faces (SD 2.1, 50 seeds, FairFace-classified).{" "}
              {guess === "mostly men" ? (
                <>
                  You guessed right — which is interesting in itself: <em>you carry the same
                  associations the model learned.</em> The rest of this article shows where the
                  model's version comes from, how strong it is, and when it gets locked in.
                </>
              ) : (
                <>
                  The model disagrees with you — and it disagrees <em>consistently</em>, across
                  every random seed. The rest of this article shows where that default comes from,
                  how strong it is, and when it gets locked in.
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer
      className="px-12 py-10 text-[12px] text-[#867f6f]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      SD Assumption Explorable — Interactive Explainability Research
    </footer>
  );
}

export default function App() {
  return (
    <div className="min-h-screen" style={{ background: "#f5f4f0", color: "#1a1a1a" }}>
      <Nav />
      <Hero />
      <PredictOpener />
      <Layer1 />
      <Layer2 />
      <Layer3 />
      <Layer4 />
      <Layer5 />
      <Methods />
      <Footer />
    </div>
  );
}
