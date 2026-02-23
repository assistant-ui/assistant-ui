"use client";

// oklch P3 amber palette
// bright:  oklch(0.80 0.18 55)  — vivid P3 amber, beyond sRGB gamut
// mid:     oklch(0.55 0.13 55)
// dim:     oklch(0.35 0.08 55)
// bg:      oklch(0.10 0.04 75)

export function ChatVisual() {
  return (
    <figure
      className="my-12"
      role="img"
      aria-label="A primitive chat interface rendered in retro amber terminal style, with message bubbles and a text input with a blinking cursor"
      style={{ colorScheme: "dark" }}
    >
      {/* SVG filter for phosphor bloom + grain */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <filter id="phosphor-chat" colorInterpolationFilters="sRGB">
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
        <div className="relative mx-auto max-w-[420px] font-mono">
          {/* CRT scanlines */}
          <div className="pointer-events-none absolute inset-0 z-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_1px,rgba(0,0,0,0.12)_1px,rgba(0,0,0,0.12)_2px)] mix-blend-screen dark:mix-blend-soft-light" />

          <div
            className="relative z-10"
            style={{ filter: "url(#phosphor-chat)" }}
          >
            {/* Title bar */}
            <div
              className="flex items-center gap-2.5 px-5 py-3"
              style={{ borderBottom: "1px solid oklch(0.35 0.08 55)" }}
            >
              <div
                className="text-xs tracking-[0.1em]"
                style={{ color: "oklch(0.35 0.08 55)" }}
              >
                CHAT.EXE
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-4 px-5 pt-6 pb-5">
              {/* AI message */}
              <div className="flex justify-start">
                <div
                  className="px-4 py-2.5 text-[13px]"
                  style={{
                    border: "1px solid oklch(0.35 0.08 55)",
                    color: "oklch(0.55 0.13 55)",
                  }}
                >
                  &gt; How can I help?
                </div>
              </div>
              {/* User message */}
              <div className="flex justify-end">
                <div
                  className="px-4 py-2.5 text-[13px]"
                  style={{
                    border: "1px solid oklch(0.80 0.18 55)",
                    color: "oklch(0.80 0.18 55)",
                    boxShadow: "0 0 8px oklch(0.80 0.20 75 / 0.15)",
                  }}
                >
                  Book a flight
                </div>
              </div>
              {/* AI message */}
              <div className="flex justify-start">
                <div
                  className="px-4 py-2.5 text-[13px]"
                  style={{
                    border: "1px solid oklch(0.35 0.08 55)",
                    color: "oklch(0.55 0.13 55)",
                  }}
                >
                  &gt; Where to?
                </div>
              </div>
            </div>

            {/* Input */}
            <div
              className="px-5 py-4"
              style={{ borderTop: "1px solid oklch(0.35 0.08 55)" }}
            >
              <div className="flex items-center">
                <span
                  className="text-[13px]"
                  style={{ color: "oklch(0.35 0.08 55)" }}
                >
                  &gt;&nbsp;
                </span>
                <span
                  className="crt-cursor inline-block h-[16px] w-[9px]"
                  style={{
                    background: "oklch(0.80 0.18 55)",
                    boxShadow: "0 0 6px oklch(0.80 0.20 75 / 0.6)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .crt-cursor {
          animation: crt-blink 1s step-end infinite;
        }
        @keyframes crt-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .crt-cursor {
            animation: none !important;
            opacity: 1;
          }
        }
      `}</style>
    </figure>
  );
}
