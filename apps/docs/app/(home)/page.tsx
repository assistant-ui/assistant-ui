"use client";

import { analytics } from "@/lib/analytics";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { TESTIMONIALS } from "@/components/home/testimonials/data";
import { TestimonialContainer } from "@/components/home/testimonials/testimonials";
import { ArrowRight } from "lucide-react";
import { FeatureHighlights } from "@/components/home/feature-highlights";
import { TrustedBy } from "@/components/home/trusted-by";
import { Hero } from "@/components/home/hero";
import { ExampleShowcase } from "@/components/home/example-showcase";
import { WarpBackground } from "@/components/home/warp-background";
import { ToolUIShowcase } from "@/components/home/tool-ui-showcase";
import { NativeShowcase } from "@/components/home/native-showcase";
import { InkShowcase } from "@/components/home/ink-showcase";
import { CopyCommandButton } from "@/components/home/copy-command-button";

export default function HomePage() {
  return (
    <main className="relative z-2 mx-auto w-full max-w-7xl flex-col space-y-10 px-4 pt-14 pb-8 md:space-y-20">
      <WarpBackground />
      <Hero />

      <ExampleShowcase />

      <FeatureHighlights />

      <TrustedBy />

      <ToolUIShowcase />

      <NativeShowcase />

      <InkShowcase />

      <section className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-medium text-3xl tracking-tight">
            Loved by developers
          </h2>
          <p className="text-muted-foreground">
            See what the community is saying.
          </p>
        </div>
        <TestimonialContainer
          testimonials={TESTIMONIALS}
          className="sm:columns-2 lg:columns-3 xl:columns-4"
        />
      </section>

      <section className="flex flex-col items-center gap-4 py-16 text-center">
        <h2 className="font-semibold text-3xl tracking-tight md:text-4xl">
          Ready to ship?
        </h2>
        <p className="max-w-md text-muted-foreground">
          Get a production-grade AI chat UI in minutes — not weeks.
        </p>
        <div className="mt-2 flex flex-col items-center gap-4">
          <div className="flex items-center gap-6">
            <Button asChild>
              <Link
                href="/docs"
                onClick={() => analytics.cta.clicked("get_started", "footer")}
              >
                Get Started <ArrowRight />
              </Link>
            </Button>
            <Link
              href="https://cal.com/simon-farshid/assistant-ui"
              onClick={() => analytics.cta.clicked("contact_sales", "footer")}
              className={buttonVariants({
                variant: "outline",
              })}
            >
              Contact Sales
            </Link>
          </div>
          <CopyCommandButton analyticsContext={{ section: "footer" }} />
        </div>
      </section>
    </main>
  );
}
