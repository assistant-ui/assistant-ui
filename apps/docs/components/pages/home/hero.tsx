"use client";

import { analytics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { StartSetupDialog } from "@/components/shared/start-setup-dialog";
import { GitHubStars } from "@/components/pages/home/github-stars";
import { NpmDownloads } from "@/components/pages/home/npm-downloads";
import { typeDeck, typeHero } from "@/components/shared/type";
import { checkoutEnabled } from "@/lib/checkout/config";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

export function Hero({
  stars,
  downloads,
}: {
  stars: number | null;
  downloads: number | null;
}) {
  return (
    <section className="flex flex-col gap-7">
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-end lg:gap-16">
        <h1 className={cn(typeHero, "max-w-[20ch]")}>
          The frontend library for AI agents.
        </h1>
        <div className="flex flex-col gap-5 lg:pb-1">
          <p className={typeDeck}>
            Primitives and a runtime for production chat. Any backend, through
            adapters.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {checkoutEnabled ? (
              <StartSetupDialog location="hero">Quick Start</StartSetupDialog>
            ) : (
              <Button
                nativeButton={false}
                render={
                  <Link
                    href="/docs/installation"
                    onClick={() => analytics.cta.clicked("get_started", "hero")}
                  />
                }
              >
                Quick Start
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <a
          href="https://github.com/assistant-ui/assistant-ui"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          <GitHubStars stars={stars} />
        </a>
        <a
          href="https://www.npmjs.com/package/@assistant-ui/react"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          <NpmDownloads downloads={downloads} />
        </a>
        <a
          href="https://www.ycombinator.com/companies/assistant-ui"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
        >
          Backed by
          <Image
            src="/icons/yc_logo.png"
            alt="Y Combinator"
            height={18}
            width={18}
          />
          Combinator
        </a>
      </div>
    </section>
  );
}
