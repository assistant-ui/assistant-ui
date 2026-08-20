"use client";

import { Fragment } from "react";
import { analytics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { CopyCommandButton } from "@/components/shared/copy-command-button";
import { GitHubStars } from "@/components/pages/home/github-stars";
import { NpmDownloads } from "@/components/pages/home/npm-downloads";
import { typeDeck, typeHero } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

const HEADLINE_WORDS = ["The", "frontend", "library", "for", "AI", "agents."];

export function Hero({
  stars,
  downloads,
}: {
  stars: number | null;
  downloads: number | null;
}) {
  return (
    <section className="relative flex flex-col pb-4 md:pb-8">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-0 hidden -translate-y-1/2 md:block"
      >
        <div className="animate-in fade-in-0 bg-foreground/[0.05] relative h-[20rem] w-[20rem] overflow-hidden [mask-image:url(/favicon/icon.svg),radial-gradient(circle,#000_40%,transparent_44%)] [mask-composite:intersect] [mask-size:contain,5px_5px] [mask-position:center,0_0] [mask-repeat:no-repeat,repeat] duration-1000">
          <span aria-hidden className="hero-glint absolute inset-0 block" />
        </div>
      </div>

      <div className="relative flex flex-col gap-4">
        <div className="flex flex-col gap-3 pb-1">
          <h1 className={cn(typeHero, "max-w-[20ch]")}>
            {HEADLINE_WORDS.map((word, index) => (
              <Fragment key={index}>
                <span
                  className="hero-word"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <span
                    className="hero-word-ink"
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    {word}
                  </span>
                </span>{" "}
              </Fragment>
            ))}
            <span
              aria-hidden
              className="hero-caret ml-1 inline-block h-[0.72em] w-[3px] bg-blue-500 align-baseline"
            />
          </h1>
          <p
            className={cn(typeDeck, "hero-rise")}
            style={{ animationDelay: "550ms" }}
          >
            Primitives and a runtime for production chat. Any backend, through
            adapters.
          </p>
        </div>

        <div
          className="hero-rise flex flex-wrap items-center gap-3"
          style={{ animationDelay: "700ms" }}
        >
          <Button
            nativeButton={false}
            render={
              <Link
                href="/docs"
                onClick={() => analytics.cta.clicked("get_started", "hero")}
              />
            }
          >
            Read the docs
          </Button>
          <CopyCommandButton withPromptOption />
        </div>

        <div
          className="hero-rise text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-3 text-[13px]"
          style={{ animationDelay: "850ms" }}
        >
          <a
            href="https://github.com/assistant-ui/assistant-ui"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            <GitHubStars stars={stars} />
          </a>
          <span className="bg-muted-foreground/20 hidden size-1 rounded-(--radius-capsule) sm:block" />
          <a
            href="https://www.npmjs.com/package/@assistant-ui/react"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            <NpmDownloads downloads={downloads} />
          </a>
          <span className="bg-muted-foreground/20 hidden size-1 rounded-(--radius-capsule) sm:block" />
          <a
            href="https://www.ycombinator.com/companies/assistant-ui"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground inline-flex w-full items-center gap-1.5 transition-colors sm:w-auto"
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
      </div>
    </section>
  );
}
