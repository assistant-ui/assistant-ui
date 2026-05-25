"use client";

import { analytics } from "@/lib/analytics";
import { StarPill } from "@/components/home/star-pill";
import { CopyCommandButton } from "@/components/home/copy-command-button";
import { CopyPromptButton } from "@/components/home/copy-prompt-button";
import { LaunchWeekBanner } from "@/components/home/launch-week-banner";
import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative flex items-start justify-between gap-10">
      <div className="flex flex-col gap-6">
        <StarPill />

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">
            The UX of ChatGPT in your own app
          </h1>
          <p className="text-muted-foreground text-lg">
            Open-source React toolkit for production AI chat experiences.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CopyCommandButton />
          <CopyPromptButton analyticsContext={{ section: "hero" }} />
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-3 text-[13px]">
          <Link
            href="/docs"
            onClick={() => analytics.cta.clicked("get_started", "hero")}
            className="shimmer text-foreground/60 hover:text-foreground font-medium"
          >
            Get Started →
          </Link>
          <span className="bg-muted-foreground/20 hidden size-1 rounded-full sm:block" />
          <Link
            href="/traction"
            onClick={() => analytics.cta.clicked("why_us", "hero")}
            className="text-foreground/60 hover:text-foreground font-medium transition-colors"
          >
            Why us?
          </Link>
          <span className="bg-muted-foreground/20 hidden size-1 rounded-full sm:block" />
          <Link
            href="https://cal.com/simon-farshid/assistant-ui"
            onClick={() => analytics.cta.clicked("contact_sales", "hero")}
            className="text-foreground/60 hover:text-foreground font-medium transition-colors"
          >
            Contact Sales
          </Link>
          <span className="bg-muted-foreground/20 hidden size-1 rounded-full sm:block" />
          <span className="inline-flex w-full items-center gap-1.5 sm:w-auto">
            Backed by
            <Image
              src="/icons/yc_logo.png"
              alt="Y Combinator"
              height={18}
              width={18}
            />
            Combinator
          </span>
        </div>
      </div>

      <LaunchWeekBanner />
    </section>
  );
}
