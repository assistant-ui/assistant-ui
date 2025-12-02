"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { TESTIMONIALS } from "@/components/testimonials/testimonials";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { TestimonialContainer } from "@/components/testimonials/TestimonialContainer";
import { ArrowRight } from "lucide-react";
import { GlowingEffect } from "@/components/home/glowing-effect";
import { FeatureHighlights } from "@/components/home/feature-highlights";
import { TrustedBy } from "@/components/home/trusted-by";
import { Hero } from "@/components/home/hero";

export default function HomePage() {
  return (
    <main className="container relative z-2 flex flex-col gap-16 px-4 py-12">
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

      <div className="relative flex w-full flex-col items-center justify-between gap-4 rounded-xl border p-6 sm:flex-row sm:p-10 lg:px-16">
        <GlowingEffect
          spread={40}
          glow={true}
          enabled={true}
          proximity={64}
          inactiveZone={0.01}
        />
        <p className="text-center font-bold text-2xl sm:text-left">
          Ship your AI assistant this week
        </p>
        <Button
          asChild
          className="w-full bg-foreground hover:bg-foreground/80 sm:w-auto"
        >
          <Link href="/docs/getting-started">
            Get Started <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </div>
    </main>
  );
}
