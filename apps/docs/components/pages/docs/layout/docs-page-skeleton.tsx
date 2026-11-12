import { DocsPageShell } from "@/components/pages/docs/layout/docs-page";

const bar = "shimmer shimmer-bg bg-muted rounded";

/** What a docs page shows while it loads: the real page frame, with shimmering placeholders tall enough to keep the footer below the fold. */
export function DocsPageSkeleton() {
  return (
    <DocsPageShell
      toc={
        <div aria-hidden className="docs-toc w-56 max-xl:hidden">
          <div className="shimmer-container sticky top-[calc(var(--docs-header-height)_+_1rem)] flex flex-col gap-2.5 pe-4 pt-4 pb-2">
            <div className={`${bar} h-3 w-20`} />
            {["w-32", "w-28", "w-36", "w-24", "w-30"].map((w, i) => (
              <div key={i} className={`${bar} h-3 ${w}`} />
            ))}
          </div>
        </div>
      }
    >
      <div
        role="status"
        aria-label="Loading page"
        className="shimmer-container flex min-h-[calc(100dvh-8rem)] flex-col"
      >
        <div className={`${bar} h-7 w-2/5 md:h-8`} />
        <div className={`${bar} mt-3 h-4 w-3/5`} />
        <div className="mt-10 flex flex-col gap-3">
          {["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-2/3"].map(
            (w, i) => (
              <div key={i} className={`${bar} h-4 ${w}`} />
            ),
          )}
        </div>
        <div className={`${bar} mt-10 h-40 w-full rounded-lg`} />
        <div className="mt-10 flex flex-col gap-3">
          {["w-full", "w-5/6", "w-full", "w-3/4"].map((w, i) => (
            <div key={i} className={`${bar} h-4 ${w}`} />
          ))}
        </div>
      </div>
    </DocsPageShell>
  );
}
