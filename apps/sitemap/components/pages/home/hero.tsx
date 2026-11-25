"use client";

import { Fragment, type CSSProperties } from "react";
import { analytics } from "@/lib/analytics";
import { DemoPanel } from "@/components/pages/home/demo-panel";
import { Button } from "@/components/ui/button";
import { GitHubStars } from "@/components/pages/home/github-stars";
import { NpmDownloads } from "@/components/pages/home/npm-downloads";
import { typeDeck, typeHero } from "@/components/shared/type";
import { CONTACT_SALES_PATH } from "@/lib/contact-sales";
import { LIBRARY_PATH } from "@/lib/library/catalog";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

/** The headline, arriving word by word. */
function HeroHeadline({ lines }: { lines: readonly string[] }) {
  let index = -1;
  return (
    <h1 className={typeHero}>
      {lines.map((line, lineIndex) => (
        <Fragment key={line}>
          {lineIndex > 0 ? (
            <>
              {" "}
              <br />
            </>
          ) : null}
          {line.split(" ").map((word, wordIndex, words) => {
            index += 1;
            return (
              <Fragment key={word}>
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
                </span>
                {wordIndex < words.length - 1 ? " " : null}
              </Fragment>
            );
          })}
        </Fragment>
      ))}{" "}
      <span
        aria-hidden
        className="hero-caret ml-1 inline-block h-[0.72em] w-[3px] bg-blue-500 align-baseline"
      />
    </h1>
  );
}

export function Hero() {
  return (
    <section className="relative grid items-center gap-12 pb-4 md:pb-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,36rem)]">
      <HeroMark />
      <div className="relative flex flex-col gap-4">
        <div className="flex flex-col gap-3 pb-1">
          <HeroHeadline lines={["The frontend for", "AI agents."]} />
          <p
            className={cn(typeDeck, "hero-rise")}
            style={{ animationDelay: "550ms" }}
          >
            Primitives and a runtime for production chat. Any backend, through
            adapters.
          </p>
        </div>
        <HeroCta
          section="hero"
          className="hero-rise"
          style={{ animationDelay: "700ms" }}
        />
      </div>
      {/* On wide screens the demos take the mark's place. */}
      <div
        className="hero-rise hidden xl:block"
        style={{ animationDelay: "850ms" }}
      >
        <DemoPanel />
      </div>
    </section>
  );
}

/** The printed mark, with its glint, on the hero's right. */
function HeroMark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-1/2 right-0 hidden -translate-y-1/2 md:block xl:hidden"
    >
      <div className="animate-in fade-in-0 bg-foreground/[0.05] relative h-[20rem] w-[20rem] overflow-hidden [mask-image:url(/favicon/icon.svg),radial-gradient(circle,#000_40%,transparent_44%)] [mask-composite:intersect] [mask-size:contain,5px_5px] [mask-position:center,0_0] [mask-repeat:no-repeat,repeat] duration-1000">
        <span aria-hidden className="hero-glint absolute inset-0 block" />
      </div>
    </div>
  );
}

/** GitHub stars, weekly downloads, and Y Combinator; parked until it has a place. */
export function HomeStats({
  stars,
  downloads,
}: {
  stars: number | null;
  downloads: number | null;
}) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-3 text-[13px]">
      <a
        href="https://github.com/assistant-ui/assistant-ui"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground transition-colors"
      >
        <GitHubStars stars={stars} />
      </a>
      <span className="bg-muted-foreground/20 rounded-capsule hidden size-1 sm:block" />
      <a
        href="https://www.npmjs.com/package/@assistant-ui/react"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground transition-colors"
      >
        <NpmDownloads downloads={downloads} />
      </a>
      <span className="bg-muted-foreground/20 rounded-capsule hidden size-1 sm:block" />
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
  );
}

/** The hero's call to action: the library plus a link to sales. */
export function HeroCta({
  section,
  className,
  style,
}: {
  section: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-3", className)}
      style={style}
    >
      <Button
        nativeButton={false}
        render={
          <Link
            href={LIBRARY_PATH}
            onClick={() => analytics.cta.clicked("get_started", section)}
          />
        }
      >
        Explore the library
      </Button>
      <Button
        variant="ghost"
        nativeButton={false}
        className="group/expert hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent"
        render={
          <Link
            href={CONTACT_SALES_PATH}
            onClick={() => analytics.cta.clicked("contact_sales", section)}
          />
        }
      >
        Talk to the team
        <ArrowRightIcon
          aria-hidden
          className="transition-transform duration-200 group-hover/expert:translate-x-1"
        />
      </Button>
    </div>
  );
}
