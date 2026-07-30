import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { LEARN_SPOTLIGHT_HREF } from "@/lib/xulux/learn/entry";

export function LearnCourseSpotlight() {
  return (
    <section className="border-primary/20 bg-primary/[0.055] mt-6 grid w-full grid-cols-1 items-center gap-4 rounded-2xl border px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6">
      <div className="min-w-0">
        <div className="text-primary text-[11px] font-semibold tracking-[0.08em] uppercase">
          New · Interactive course
        </div>
        <h2 className="mt-1 text-base font-semibold tracking-tight sm:text-lg">
          Not sure what to build? Build your first AI app
        </h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Interactive lessons · Live code and preview · No setup required
        </p>
      </div>

      <Link
        href={LEARN_SPOTLIGHT_HREF}
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg px-4 text-sm font-medium shadow-sm transition-colors sm:self-auto"
      >
        Start course
        <ArrowRightIcon className="size-4" />
      </Link>
    </section>
  );
}
