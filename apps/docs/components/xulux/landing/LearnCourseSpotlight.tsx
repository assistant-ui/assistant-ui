import Link from "next/link";
import { ArrowRightIcon, BookOpenIcon } from "lucide-react";
import { LEARN_SPOTLIGHT_HREF } from "@/lib/xulux/learn/entry";

export function LearnCourseSpotlight() {
  return (
    <section
      aria-label="Interactive course"
      className="mt-5 grid w-full max-w-2xl grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 rounded-2xl border border-violet-200/80 bg-violet-50/70 px-3.5 py-3 sm:w-[86%] sm:grid-cols-[auto_minmax(0,1fr)_auto] dark:border-violet-800/60 dark:bg-violet-950/30"
    >
      <div className="row-span-2 grid size-9 shrink-0 place-items-center rounded-xl border border-violet-200/80 bg-white/70 text-violet-600 sm:row-span-1 dark:border-violet-800/60 dark:bg-violet-950/50 dark:text-violet-400">
        <BookOpenIcon className="size-4" />
      </div>

      <div className="min-w-0">
        <div className="text-[10px] font-semibold tracking-[0.08em] text-violet-600 uppercase dark:text-violet-400">
          New · Interactive course
        </div>
        <h2 className="mt-0.5 truncate text-sm font-semibold tracking-tight">
          Learn to create your first AI app
        </h2>
      </div>

      <Link
        href={LEARN_SPOTLIGHT_HREF}
        className="col-start-2 inline-flex shrink-0 items-center gap-1 justify-self-start text-xs font-semibold text-violet-600 transition-colors hover:text-violet-800 sm:col-start-3 sm:row-start-1 sm:justify-self-end dark:text-violet-400 dark:hover:text-violet-300"
      >
        Start course
        <ArrowRightIcon className="size-3.5" />
      </Link>
    </section>
  );
}
