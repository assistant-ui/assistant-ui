"use client";

export function ScaffoldingVisual() {
  return (
    <figure
      className="my-12"
      role="img"
      aria-label="Three stages showing dialogue as scaffolding: Now (full scaffolding with active conversation), Learning (partial scaffolding), and Destination (no scaffolding, calm computing achieved)"
    >
      <div className="flex flex-col items-center justify-center gap-6 md:flex-row md:items-end md:gap-6">
        {/* Stage 1: Now */}
        <div className="flex flex-col items-center">
          <div className="mb-6 font-semibold text-[11px] text-zinc-400 uppercase tracking-[0.12em] dark:text-zinc-500">
            Now
          </div>
          <div className="relative h-[220px] w-[200px]">
            {/* Building */}
            <div className="absolute bottom-0 left-1/2 flex h-[160px] w-[120px] -translate-x-1/2 flex-col items-center justify-center gap-0.5 rounded-t-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-2 text-2xl opacity-40">◎</div>
              <div className="text-center font-medium text-[10px] text-zinc-500 uppercase leading-snug tracking-wide">
                Calm
                <br />
                computing
              </div>
            </div>

            {/* Scaffolding */}
            <div className="pointer-events-none absolute bottom-0 left-1/2 h-[180px] w-[160px] -translate-x-1/2">
              {/* Poles */}
              <div className="absolute bottom-0 left-0 h-full w-[3px] rounded-sm bg-zinc-400 dark:bg-zinc-700" />
              <div className="absolute right-0 bottom-0 h-full w-[3px] rounded-sm bg-zinc-400 dark:bg-zinc-700" />
              {/* Bars */}
              <div className="absolute top-0 right-0 left-0 h-[3px] rounded-sm bg-zinc-400 dark:bg-zinc-700" />
              <div className="absolute top-[33%] right-0 left-0 h-[3px] rounded-sm bg-zinc-400 dark:bg-zinc-700" />
              <div className="absolute top-[66%] right-0 left-0 h-[3px] rounded-sm bg-zinc-400 dark:bg-zinc-700" />
              <div className="absolute right-0 bottom-[10px] left-0 h-[3px] rounded-sm bg-zinc-400 dark:bg-zinc-700" />
              {/* Braces */}
              <div
                className="absolute top-[3px] left-[3px] h-[90px] w-0.5 origin-top rounded-sm bg-zinc-400 dark:bg-zinc-700"
                style={{ transform: "rotate(12deg)" }}
              />
              <div
                className="absolute top-[3px] right-[3px] h-[90px] w-0.5 origin-top rounded-sm bg-zinc-400 dark:bg-zinc-700"
                style={{ transform: "rotate(-12deg)" }}
              />
              {/* Dialogue dots */}
              {[30, 70, 110, 150].map((top, i) => (
                <div
                  key={top}
                  className="dialogue-dot absolute h-2.5 w-2.5 rounded-full bg-zinc-900 dark:bg-zinc-50"
                  style={{
                    top: `${top}px`,
                    [i % 2 === 0 ? "left" : "right"]: "-5px",
                    animation: `pulse-dot 2s ease-in-out infinite ${i * 0.5}s`,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="mt-6 text-center text-xs text-zinc-500 leading-snug">
            Dialogue mediates
            <br />
            everything
          </div>
        </div>

        {/* Arrow */}
        <div className="mb-[110px] flex w-10 flex-shrink-0 items-center justify-center max-md:mb-0 max-md:rotate-90">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-6 w-6 text-zinc-400 dark:text-zinc-700"
          >
            <path
              d="M5 12h14M13 5l7 7-7 7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Stage 2: Learning */}
        <div className="flex flex-col items-center">
          <div className="mb-6 font-semibold text-[11px] text-zinc-400 uppercase tracking-[0.12em] dark:text-zinc-500">
            Learning
          </div>
          <div className="relative h-[220px] w-[200px]">
            {/* Building */}
            <div className="absolute bottom-0 left-1/2 flex h-[160px] w-[120px] -translate-x-1/2 flex-col items-center justify-center gap-0.5 rounded-t-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-2 text-2xl opacity-40">◎</div>
              <div className="text-center font-medium text-[10px] text-zinc-500 uppercase leading-snug tracking-wide">
                Calm
                <br />
                computing
              </div>
            </div>

            {/* Partial scaffolding */}
            <div className="pointer-events-none absolute bottom-0 left-1/2 h-[180px] w-[160px] -translate-x-1/2 opacity-50">
              {/* Shorter poles */}
              <div className="absolute bottom-0 left-0 h-[50%] w-[3px] rounded-sm bg-zinc-400 dark:bg-zinc-700" />
              <div className="absolute right-0 bottom-0 h-[50%] w-[3px] rounded-sm bg-zinc-400 dark:bg-zinc-700" />
              {/* Fewer bars */}
              <div className="absolute top-[50%] right-0 left-0 h-[3px] rounded-sm bg-zinc-400 dark:bg-zinc-700" />
              <div className="absolute right-0 bottom-[10px] left-0 h-[3px] rounded-sm bg-zinc-400 dark:bg-zinc-700" />
              {/* Single faded dot */}
              <div
                className="dialogue-dot absolute h-2.5 w-2.5 rounded-full bg-zinc-900 opacity-30 dark:bg-zinc-50"
                style={{
                  top: "100px",
                  left: "-5px",
                  animation: "pulse-dot 3s ease-in-out infinite",
                }}
              />
            </div>
          </div>
          <div className="mt-6 text-center text-xs text-zinc-500 leading-snug">
            System anticipates,
            <br />
            asks less
          </div>
        </div>

        {/* Arrow */}
        <div className="mb-[110px] flex w-10 flex-shrink-0 items-center justify-center max-md:mb-0 max-md:rotate-90">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-6 w-6 text-zinc-400 dark:text-zinc-700"
          >
            <path
              d="M5 12h14M13 5l7 7-7 7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Stage 3: Destination */}
        <div className="flex flex-col items-center">
          <div className="mb-6 font-semibold text-[11px] text-zinc-400 uppercase tracking-[0.12em] dark:text-zinc-500">
            Destination
          </div>
          <div className="relative h-[220px] w-[200px]">
            {/* Building - glowing */}
            <div className="building-glow absolute bottom-0 left-1/2 flex h-[160px] w-[120px] -translate-x-1/2 flex-col items-center justify-center gap-0.5 rounded-t-lg border border-zinc-300 bg-zinc-200/80 dark:border-zinc-700 dark:bg-zinc-800/80">
              <div className="mb-2 text-2xl opacity-60">◎</div>
              <div className="text-center font-medium text-[10px] text-zinc-600 uppercase leading-snug tracking-wide dark:text-zinc-500">
                Calm
                <br />
                computing
              </div>
            </div>
          </div>
          <div className="mt-6 text-center text-xs text-zinc-500 leading-snug">
            Computing disappears
            <br />
            into life
          </div>
        </div>
      </div>

      <figcaption className="mt-14 text-center font-medium text-[15px] text-zinc-500 tracking-tight">
        Dialogue is scaffolding, working toward its own obsolescence
      </figcaption>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        .building-glow {
          box-shadow: 0 0 60px rgba(24, 24, 27, 0.08), 0 0 120px rgba(24, 24, 27, 0.04);
        }
        :is(.dark) .building-glow {
          box-shadow: 0 0 60px rgba(250, 250, 250, 0.06), 0 0 120px rgba(250, 250, 250, 0.03);
        }
        @media (prefers-reduced-motion: reduce) {
          .dialogue-dot {
            animation: none !important;
            opacity: 0.6;
            transform: scale(1);
          }
        }
      `}</style>
    </figure>
  );
}
