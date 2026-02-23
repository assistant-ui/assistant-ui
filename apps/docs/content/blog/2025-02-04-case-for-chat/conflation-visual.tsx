"use client";

// oklch P3 amber palette
// bright:  oklch(0.80 0.18 55)  — vivid P3 amber, beyond sRGB gamut
// mid:     oklch(0.55 0.13 55)
// dim:     oklch(0.35 0.08 55)
// bg:      oklch(0.10 0.04 75)

export function ConflationVisual() {
  return (
    <figure
      className="my-12"
      role="img"
      aria-label="A time ruler showing 135,000 years of dialogue history, where the entire era of chat interfaces is a barely-visible sliver at the far right edge"
      style={{ colorScheme: "dark" }}
    >
      {/* SVG filter for phosphor bloom + grain */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="phosphor-ruler" colorInterpolationFilters="sRGB">
            {/* Bloom: blur source, brighten, screen-blend back */}
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="1.5"
              result="glow"
            />
            <feColorMatrix
              in="glow"
              type="matrix"
              values="1.4 0 0 0 0  0 1.4 0 0 0  0 0 1.4 0 0  0 0 0 0.6 0"
              result="brightGlow"
            />
            <feBlend in="SourceGraphic" in2="brightGlow" mode="screen" />
          </filter>
        </defs>
      </svg>

      {/* Break out wider than article text */}
      <div className="relative left-1/2 w-[calc(100%+4rem)] -translate-x-1/2 md:w-[calc(100%+10rem)]">
        <div className="relative font-mono">
          {/* CRT scanlines */}
          <div className="pointer-events-none absolute inset-0 z-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_1px,rgba(0,0,0,0.12)_1px,rgba(0,0,0,0.12)_2px)] mix-blend-screen dark:mix-blend-soft-light" />

          <div
            className="relative z-10 px-6 py-7"
            style={{ filter: "url(#phosphor-ruler)" }}
          >
            {/* Title */}
            <div
              className="mb-6 text-center text-xs tracking-[0.1em]"
              style={{ color: "oklch(0.55 0.13 55)" }}
            >
              ~135,000 YEARS OF HUMAN DIALOGUE
            </div>

            {/* The ruler bar */}
            <div className="relative px-5">
              <div
                className="relative h-6"
                style={{
                  background: "oklch(0.55 0.13 55)",
                  boxShadow: "0 0 12px oklch(0.80 0.20 75 / 0.15)",
                }}
              >
                {/* Chat UI sliver */}
                <div
                  className="sliver-pulse absolute top-0 right-0 z-[2] h-full w-[3px]"
                  style={{
                    background: "oklch(0.80 0.18 55)",
                    boxShadow:
                      "0 0 8px oklch(0.80 0.20 75 / 0.8), 0 0 20px oklch(0.80 0.20 75 / 0.4)",
                  }}
                />
              </div>
            </div>

            {/* Start / end labels */}
            <div className="mt-2 flex justify-between px-5">
              <div
                className="text-xs tracking-[0.05em]"
                style={{ color: "oklch(0.55 0.13 55)" }}
              >
                ~135K YRS AGO
              </div>
              <div
                className="text-right text-xs tracking-[0.05em]"
                style={{
                  color: "oklch(0.80 0.18 55)",
                  textShadow: "0 0 6px oklch(0.80 0.20 75 / 0.4)",
                }}
              >
                NOW
              </div>
            </div>

            {/* Bracket annotation pointing at sliver */}
            <div className="relative mt-5 px-5">
              <div className="relative h-8">
                {/* Tick down from sliver */}
                <div
                  className="absolute top-0 right-0 h-3 w-0.5"
                  style={{ background: "oklch(0.80 0.18 55)" }}
                />
                {/* Horizontal arm */}
                <div
                  className="absolute top-3 right-0 h-0.5 w-20"
                  style={{ background: "oklch(0.80 0.18 55)" }}
                />
                {/* Label */}
                <div
                  className="absolute top-1 right-[86px] whitespace-nowrap font-bold text-xs tracking-[0.05em]"
                  style={{
                    color: "oklch(0.80 0.18 55)",
                    textShadow: "0 0 6px oklch(0.80 0.20 75 / 0.5)",
                  }}
                >
                  "CHAT UI"
                </div>
                <div
                  className="absolute top-[18px] right-[86px] whitespace-nowrap text-[10px] tracking-[0.05em]"
                  style={{ color: "oklch(0.55 0.13 55)" }}
                >
                  ~30 YEARS
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .sliver-pulse::after {
          content: '';
          position: absolute;
          inset: 0;
          background: oklch(0.80 0.18 55);
          animation: sliver-pulse-anim 2s step-end infinite;
        }
        @keyframes sliver-pulse-anim {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sliver-pulse::after {
            animation: none !important;
            opacity: 1;
          }
        }
      `}</style>
    </figure>
  );
}
