"use client";

export function TimelineVisual() {
  const events = [
    {
      label: (
        <>
          Licklider's
          <br />
          "Symbiosis"
        </>
      ),
      year: "1960",
      sublabel: "the vision",
      type: "vision",
    },
    {
      label: (
        <>
          Knowledge
          <br />
          Navigator
        </>
      ),
      year: "1987",
      sublabel: "filmed it",
      type: "vision",
    },
    {
      label: "Siri",
      year: "2011",
      sublabel: "wrong architecture",
      type: "failure",
    },
    {
      label: "Transformers",
      year: "2017",
      sublabel: "the breakthrough",
      type: "breakthrough",
    },
    {
      label: "",
      year: "Now",
      sublabel: "gap closing",
      type: "now",
    },
  ];

  return (
    <figure
      className="my-12"
      role="img"
      aria-label="Timeline showing 65-year gap between Licklider's vision in 1960 and the transformer breakthrough in 2017"
    >
      {/* Gap annotation */}
      <div className="mb-12 flex items-center gap-4 pl-5">
        <div className="relative h-px max-w-[520px] flex-1 bg-gradient-to-r from-zinc-400 via-zinc-400 to-transparent dark:from-zinc-700 dark:via-zinc-700">
          <div className="absolute -top-1.5 left-0 h-3 w-px bg-zinc-400 dark:bg-zinc-700" />
          <div className="absolute -top-1.5 right-[10%] h-3 w-px bg-zinc-400 dark:bg-zinc-700" />
        </div>
        <div className="whitespace-nowrap font-medium text-[13px] text-zinc-500 tracking-wide">
          <span className="font-semibold text-[15px] text-zinc-600 tabular-nums dark:text-zinc-400">
            65
          </span>{" "}
          years waiting
        </div>
      </div>

      {/* Timeline */}
      <div className="relative px-5">
        {/* Track */}
        <div className="track absolute top-1/2 right-5 left-5 h-0.5 -translate-y-1/2 bg-zinc-300 dark:bg-zinc-800" />

        {/* Events */}
        <div className="relative flex h-[200px] items-center justify-between">
          {events.map((event) => (
            <div key={event.year} className="z-10 flex flex-col items-center">
              <div
                className={`flex min-h-[34px] items-end justify-center text-center font-medium text-xs leading-snug ${
                  event.type === "failure"
                    ? "text-zinc-400 dark:text-zinc-500"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {event.label}
              </div>

              {/* Dot */}
              <div
                className={`relative my-5 h-4 w-4 rounded-full ${
                  event.type === "vision"
                    ? "border-2 border-zinc-400 bg-white dark:border-zinc-500 dark:bg-zinc-950"
                    : event.type === "failure"
                      ? "border-2 border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900"
                      : event.type === "breakthrough"
                        ? "dot-breakthrough border-2 border-zinc-900 bg-zinc-900 dark:border-zinc-50 dark:bg-zinc-50"
                        : "dot-now border-2 border-zinc-900 bg-zinc-900 dark:border-zinc-50 dark:bg-zinc-50"
                }`}
              >
                {event.type === "failure" && (
                  <div className="absolute top-1/2 left-1/2 h-0.5 w-5 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-zinc-400 dark:bg-zinc-700" />
                )}
              </div>

              <div
                className={`font-semibold text-lg tabular-nums ${
                  event.type === "failure"
                    ? "text-zinc-400 dark:text-zinc-500"
                    : "text-zinc-900 dark:text-zinc-50"
                }`}
              >
                {event.year}
              </div>

              <div
                className={`mt-1 min-h-4 text-[11px] ${
                  event.type === "failure" ? "text-red-500/70" : "text-zinc-500"
                }`}
              >
                {event.sublabel}
              </div>
            </div>
          ))}
        </div>
      </div>

      <figcaption className="mt-16 text-center font-medium text-[15px] text-zinc-500 tracking-tight">
        The vision was never wrong. The technology finally caught up.
      </figcaption>

      <style>{`
        .track::after {
          content: '';
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 35%;
          height: 2px;
          background: linear-gradient(90deg, #d4d4d8 0%, #18181b 100%);
          opacity: 0.6;
        }
        :is(.dark) .track::after {
          background: linear-gradient(90deg, #27272a 0%, #fafafa 100%);
        }
        .dot-breakthrough {
          box-shadow: 0 0 20px rgba(24, 24, 27, 0.3), 0 0 40px rgba(24, 24, 27, 0.15);
        }
        :is(.dark) .dot-breakthrough {
          box-shadow: 0 0 20px rgba(250, 250, 250, 0.4), 0 0 40px rgba(250, 250, 250, 0.2);
        }
        .dot-now {
          animation: pulse-now-light 2s ease-in-out infinite;
        }
        :is(.dark) .dot-now {
          animation: pulse-now-dark 2s ease-in-out infinite;
        }
        @keyframes pulse-now-light {
          0%, 100% {
            box-shadow: 0 0 20px rgba(24, 24, 27, 0.3),
                        0 0 40px rgba(24, 24, 27, 0.15);
          }
          50% {
            box-shadow: 0 0 30px rgba(24, 24, 27, 0.5),
                        0 0 60px rgba(24, 24, 27, 0.25);
          }
        }
        @keyframes pulse-now-dark {
          0%, 100% {
            box-shadow: 0 0 20px rgba(250, 250, 250, 0.4),
                        0 0 40px rgba(250, 250, 250, 0.2);
          }
          50% {
            box-shadow: 0 0 30px rgba(250, 250, 250, 0.6),
                        0 0 60px rgba(250, 250, 250, 0.3);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot-now {
            animation: none !important;
          }
        }
      `}</style>
    </figure>
  );
}
