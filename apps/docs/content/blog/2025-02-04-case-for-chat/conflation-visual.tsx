"use client";

export function ConflationVisual() {
  const turns = [
    { label: "initiate", from: "left" },
    { label: "respond", from: "right" },
    { label: "ground", from: "left" },
    { label: "confirm", from: "right" },
  ];

  return (
    <figure
      className="relative my-20 md:my-28"
      role="img"
      aria-label="Comparison showing what critics see (a chat interface) versus what's actually there (two humans in dialogue with universal turn-taking timing)"
    >
      {/* Break out of the article container */}
      <div className="relative left-1/2 w-screen -translate-x-1/2">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 items-center gap-16 md:grid-cols-[1fr,auto,1fr] md:gap-12 lg:gap-20">
            {/* Left: What they see */}
            <div className="flex flex-col items-center">
              <div className="mb-8 font-semibold text-xs text-zinc-400 uppercase tracking-[0.15em] dark:text-zinc-500">
                What they see
              </div>

              {/* Chat mockup - no box, just floating bubbles */}
              <div className="w-full max-w-[320px] space-y-4">
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-3xl rounded-bl-lg bg-zinc-200/80 px-5 py-3.5 text-[15px] text-zinc-600 leading-relaxed dark:bg-zinc-800/80 dark:text-zinc-400">
                    How can I help?
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-3xl rounded-br-lg bg-zinc-800 px-5 py-3.5 text-[15px] text-zinc-50 leading-relaxed dark:bg-zinc-200 dark:text-zinc-900">
                    Book a flight
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-3xl rounded-bl-lg bg-zinc-200/80 px-5 py-3.5 text-[15px] text-zinc-600 leading-relaxed dark:bg-zinc-800/80 dark:text-zinc-400">
                    Where to?
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
                  <span className="text-[13px] text-zinc-400 dark:text-zinc-600">
                    Message...
                  </span>
                  <div className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
                </div>
              </div>

              <div className="mt-10 text-center">
                <div className="font-medium text-base text-zinc-600 dark:text-zinc-400">
                  A UI pattern
                </div>
                <div className="mt-1 text-sm text-zinc-400 dark:text-zinc-600">
                  circa 2010
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center justify-center max-md:py-4">
              <div className="flex items-center gap-4 md:flex-col">
                <div className="h-px w-16 bg-gradient-to-r from-transparent via-zinc-300 to-transparent md:h-24 md:w-px md:bg-gradient-to-b dark:via-zinc-700" />
                <div className="font-semibold text-sm text-zinc-400 dark:text-zinc-600">
                  vs
                </div>
                <div className="h-px w-16 bg-gradient-to-r from-transparent via-zinc-300 to-transparent md:h-24 md:w-px md:bg-gradient-to-b dark:via-zinc-700" />
              </div>
            </div>

            {/* Right: What's actually there - Two humans in dialogue */}
            <div className="flex flex-col items-center">
              <div className="mb-8 font-semibold text-xs text-zinc-400 uppercase tracking-[0.15em] dark:text-zinc-500">
                What's actually there
              </div>

              {/* Two profile faces with dialogue flowing between */}
              <div className="flex w-full max-w-[640px] items-center justify-center">
                {/* Left face - abstract profile facing right */}
                <div className="relative flex-shrink-0">
                  {/* Head circle */}
                  <div className="h-28 w-28 rounded-full bg-zinc-800 md:h-36 md:w-36 dark:bg-zinc-200" />
                  {/* Nose indicator pointing right */}
                  <div className="absolute top-1/2 -right-2 h-0 w-0 -translate-y-1/2 border-y-[10px] border-y-transparent border-l-[16px] border-l-zinc-800 md:-right-3 md:border-y-[12px] md:border-l-[20px] dark:border-l-zinc-200" />
                </div>

                {/* Turn labels stacked vertically between faces */}
                <div className="flex flex-col items-center gap-4 px-10 md:px-14 lg:px-20">
                  {turns.map((turn) => (
                    <div key={turn.label} className="flex items-center gap-3">
                      {turn.from === "left" && (
                        <div className="h-2 w-2 rounded-full bg-zinc-700 dark:bg-zinc-300" />
                      )}
                      <span className="min-w-[72px] text-center font-medium text-[13px] text-zinc-600 uppercase tracking-wide dark:text-zinc-400">
                        {turn.label}
                      </span>
                      {turn.from === "right" && (
                        <div className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Right face - abstract profile facing left */}
                <div className="relative flex-shrink-0">
                  {/* Head circle */}
                  <div className="h-28 w-28 rounded-full bg-zinc-400 md:h-36 md:w-36 dark:bg-zinc-600" />
                  {/* Nose indicator pointing left */}
                  <div className="absolute top-1/2 -left-2 h-0 w-0 -translate-y-1/2 border-y-[10px] border-y-transparent border-r-[16px] border-r-zinc-400 md:-left-3 md:border-y-[12px] md:border-r-[20px] dark:border-r-zinc-600" />
                </div>
              </div>

              {/* Stats */}
              <div className="mt-10 text-center">
                <div className="font-semibold text-zinc-900 tabular-nums leading-none dark:text-zinc-50">
                  <span className="text-4xl md:text-5xl">~200</span>
                  <span className="ml-1 font-normal text-lg text-zinc-500">
                    ms
                  </span>
                </div>
                <div className="mt-2 text-sm text-zinc-500">
                  universal turn gap
                </div>
                <div className="mt-1 text-sm text-zinc-400 dark:text-zinc-600">
                  200,000 years old
                </div>
              </div>
            </div>
          </div>

          {/* Caption */}
          <figcaption className="mt-16 text-center text-lg text-zinc-500 tracking-tight md:mt-20 md:text-xl">
            They're conflating a UI pattern with a communication primitive
          </figcaption>
        </div>
      </div>
    </figure>
  );
}
