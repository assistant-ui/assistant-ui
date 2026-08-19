"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

const LOGOS: {
  src: string;
  alt: string;
  href: string;
  invert?: boolean;
  darkSrc?: string;
}[] = [
  {
    src: "/icons/cust/anthropic.svg",
    alt: "Anthropic",
    href: "https://www.anthropic.com?ref=assistant-ui",
  },
  {
    src: "/icons/cust/google-cloud.svg",
    darkSrc: "/icons/cust/google-cloud-white.svg",
    alt: "Google Cloud",
    href: "https://cloud.google.com?ref=assistant-ui",
    invert: false,
  },
  {
    src: "/icons/cust/langchain.svg",
    alt: "Langchain",
    href: "https://langchain.com?ref=assistant-ui",
  },
  {
    src: "/icons/cust/builder.svg",
    alt: "Builder.io",
    href: "https://www.builder.io?ref=assistant-ui",
  },
  {
    src: "/icons/cust/paperclip.svg",
    alt: "Paperclip",
    href: "https://paperclip.ing?ref=assistant-ui",
  },
  {
    src: "/icons/cust/unsloth.png",
    darkSrc: "/icons/cust/unsloth-white.png",
    alt: "Unsloth",
    href: "https://unsloth.ai?ref=assistant-ui",
    invert: false,
  },
  {
    src: "/icons/cust/hermes.png",
    alt: "Hermes Agent",
    href: "https://hermes-agent.nousresearch.com?ref=assistant-ui",
    invert: false,
  },
  {
    src: "/icons/cust/athenaintel.png",
    alt: "Athena Intelligence",
    href: "https://athenaintelligence.ai?ref=assistant-ui",
  },
  {
    src: "/icons/cust/browseruse.svg",
    alt: "Browseruse",
    href: "https://browser-use.com/?ref=assistant-ui",
  },
  {
    src: "/icons/cust/stack.svg",
    alt: "Stack",
    href: "https://stack-ai.com?ref=assistant-ui",
  },
  {
    src: "/icons/cust/mastra.svg",
    alt: "Mastra",
    href: "https://mastra.ai?ref=assistant-ui",
  },
];

const COPIES = 3;

function LogoList({ copy }: { copy: number }) {
  return (
    <>
      {LOGOS.map((logo) => (
        <Link
          key={`${copy}-${logo.alt}`}
          href={logo.href}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={copy === 0 ? undefined : -1}
          className="inline-flex h-8 shrink-0 items-center"
        >
          <Image
            src={logo.src}
            alt={copy === 0 ? logo.alt : ""}
            width={120}
            height={24}
            className={cn(
              "h-6 w-auto shrink-0 object-contain opacity-40 transition-opacity hover:opacity-100",
              logo.darkSrc
                ? "dark:hidden"
                : logo.invert === false
                  ? undefined
                  : "invert dark:invert-0",
            )}
          />
          {logo.darkSrc ? (
            <Image
              src={logo.darkSrc}
              alt=""
              width={120}
              height={24}
              className="hidden h-6 w-auto shrink-0 object-contain opacity-40 transition-opacity hover:opacity-100 dark:block"
            />
          ) : null}
        </Link>
      ))}
    </>
  );
}

export function TrustedBy() {
  return (
    <section className="flex flex-col items-center gap-4">
      <div className="hidden w-full flex-wrap items-center justify-center gap-x-12 gap-y-8 motion-reduce:flex">
        <LogoList copy={0} />
      </div>
      <div className="group flex w-full gap-(--gap) overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] [--duration:48s] [--gap:3rem] motion-reduce:hidden">
        {Array.from({ length: COPIES }).map((_, copy) => (
          <div
            key={copy}
            aria-hidden={copy === 0 ? undefined : true}
            className="animate-marquee flex shrink-0 items-center gap-(--gap) group-hover:[animation-play-state:paused]"
          >
            <LogoList copy={copy} />
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-sm">and teams everywhere</p>
    </section>
  );
}
