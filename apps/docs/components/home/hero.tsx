"use client";

import { analytics } from "@/lib/analytics";
import { StarPill } from "@/components/home/star-pill";
import { CopyCommandButton } from "@/components/home/copy-command-button";
import { LaunchWeekBanner } from "@/components/home/launch-week-banner";
import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative flex items-start justify-between gap-10">
      <div className="flex flex-col gap-6">
        <StarPill />

        <div className="flex flex-col gap-2">
          <h1 className="font-semibold text-3xl tracking-tight md:text-5xl">
            The UX of ChatGPT
            <br />
            in your own app
          </h1>
          <p className="max-w-lg text-lg text-muted-foreground md:text-xl">
            Open-source React toolkit for production AI chat experiences.
          </p>
        </div>

        <CopyCommandButton />

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[13px] text-muted-foreground">
          <Link
            href="/docs"
            onClick={() => analytics.cta.clicked("get_started", "hero")}
            className="shimmer font-medium text-foreground/60 hover:text-foreground"
          >
            Get Started →
          </Link>
          <span className="hidden size-1 rounded-full bg-muted-foreground/20 sm:block" />
          <Link
            href="https://cal.com/simon-farshid/assistant-ui"
            onClick={() => analytics.cta.clicked("contact_sales", "hero")}
            className="font-medium text-foreground/60 transition-colors hover:text-foreground"
          >
            Contact Sales
          </Link>
          <span className="hidden size-1 rounded-full bg-muted-foreground/20 sm:block" />
          <span className="inline-flex w-full items-center gap-1.5 sm:w-auto">
            Backed by
            <Image
              src="/icons/yc_logo.png"
              alt="Y Combinator"
              height={18}
              width={18}
              className="inline"
            />
            <span className="font-medium">Y Combinator</span>
          </span>
        </div>
      </div>

      <LaunchWeekBanner />
    </section>
  );
}
