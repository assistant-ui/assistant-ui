"use client";

import { analytics } from "@/lib/analytics";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { TESTIMONIALS } from "@/components/pages/home/testimonials/data";
import { TestimonialContainer } from "@/components/pages/home/testimonials/testimonials";
import { ArrowRight } from "lucide-react";
import { FeatureHighlights } from "@/components/pages/home/feature-highlights";
import { TrustedBy } from "@/components/pages/home/trusted-by";
import { Hero } from "@/components/pages/home/hero";
import { ExampleShowcase } from "@/components/pages/home/example-showcase";
import { PageFrame } from "@/components/shared/page-frame";
import { typeSection } from "@/components/shared/type";

export default function HomePage() {
  return (
    <PageFrame
      pad="hero"
      className="relative z-2 flex-col space-y-10 md:space-y-20"
    >
      <Hero />

      <ExampleShowcase />

      <FeatureHighlights />

      <TrustedBy />

      <TestimonialContainer
        testimonials={TESTIMONIALS}
        className="sm:columns-2 lg:columns-3 xl:columns-4"
      />

      <section className="flex flex-col items-start gap-6 py-16">
        <p className={typeSection}>The UX of ChatGPT in your own app.</p>
        <div className="flex items-center gap-6">
          <Button
            nativeButton={false}
            render={
              <Link
                href="/docs"
                onClick={() => analytics.cta.clicked("get_started", "footer")}
              />
            }
          >
            Get Started <ArrowRight />
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
      </section>
    </PageFrame>
  );
}
