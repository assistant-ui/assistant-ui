"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { TESTIMONIALS } from "@/components/home/testimonials/data";
import { TestimonialContainer } from "@/components/home/testimonials/testimonials";
import { ArrowRight } from "lucide-react";
import { FeatureHighlights } from "@/components/home/feature-highlights";
import { TrustedBy } from "@/components/home/trusted-by";
import { Hero } from "@/components/home/hero";
import { ExampleShowcase } from "@/components/home/example-showcase";

export default function HomePage() {
  return (
    <main className="container relative z-2 mx-auto flex-col space-y-10 px-4 py-12 md:space-y-20 md:px-20">
      <Hero />

      <ExampleShowcase />

      <FeatureHighlights />

      <TrustedBy />

      <TestimonialContainer
        testimonials={TESTIMONIALS}
        className="sm:columns-2 lg:columns-3 xl:columns-4"
      />

      <section className="flex flex-col items-center gap-6 py-16 text-center">
        <p className="font-medium text-2xl tracking-tight">
          Build once. Ready for production.
        </p>
        <div className="flex items-center gap-6">
          <Button asChild>
            <Link href="/docs/getting-started">
              Get Started <ArrowRight />
            </Link>
          </Button>
          <Link
            href="https://cal.com/simon-farshid/assistant-ui"
            className={buttonVariants({
              variant: "outline",
            })}
          >
            Contact Sales
          </Link>
        </div>
      </section>
    </main>
  );
}
