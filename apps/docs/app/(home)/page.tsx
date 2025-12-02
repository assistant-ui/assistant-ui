"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { TESTIMONIALS } from "@/components/testimonials/testimonials";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { TestimonialContainer } from "@/components/testimonials/TestimonialContainer";
import { ArrowRight } from "lucide-react";
import { FeatureHighlights } from "@/components/home/feature-highlights";
import { TrustedBy } from "@/components/home/trusted-by";
import { Hero } from "@/components/home/hero";

export default function HomePage() {
  return (
    <main className="container relative z-2 flex flex-col gap-24 px-4 py-12">
      <Hero />

      <FeatureHighlights />

      <TrustedBy />

      <section className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-medium text-3xl tracking-tight">
            Be part of the community
          </h2>
          <p className="text-muted-foreground">
            Join our active Discord community for support and updates.
          </p>
        </div>

        <div className="flex w-full max-w-md flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            className={buttonVariants({
              variant: "outline",
            })}
            href="https://discord.gg/S9dwgCNEFs"
          >
            <DiscordLogoIcon className="mr-2 size-4 text-indigo-600" />
            Join our Discord
          </Link>
          <Link
            className={buttonVariants({
              variant: "outline",
            })}
            href="https://github.com/assistant-ui/assistant-ui"
          >
            <span className="mr-2">🌟</span> Star us on GitHub
          </Link>
        </div>

        <div className="relative mx-auto max-h-[500px] w-full max-w-7xl overflow-hidden">
          <TestimonialContainer
            testimonials={TESTIMONIALS}
            className="sm:columns-2 lg:columns-3 xl:columns-4"
          />
          <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-16 w-full bg-linear-to-t from-background" />
        </div>
      </section>

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
