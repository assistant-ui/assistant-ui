import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { LEARN_SPOTLIGHT_HREF } from "@/lib/xulux/learn/entry";

export function LearnCourseSpotlight() {
  return (
    <section
      aria-label="Interactive course"
      className="mt-5 flex w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-sm"
    >
      <span className="text-muted-foreground">Not sure what to build?</span>
      <Link
        href={LEARN_SPOTLIGHT_HREF}
        className="inline-flex items-center gap-1 font-semibold text-[#6557dc] transition-colors hover:text-[#4f43bd] dark:text-violet-400 dark:hover:text-violet-300"
      >
        Learn to create your first AI app
        <ArrowRightIcon className="size-3.5" />
      </Link>
    </section>
  );
}
