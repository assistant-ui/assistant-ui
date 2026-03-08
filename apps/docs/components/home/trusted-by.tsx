"use client";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import Image from "next/image";
import Link from "next/link";

const LOGOS = [
  {
    src: "/icons/cust/langchain.svg",
    alt: "Langchain",
    height: "h-7",
    href: "https://langchain.com?ref=assistant-ui",
  },
  {
    src: "/icons/cust/athenaintel.png",
    alt: "Athena Intelligence",
    height: "h-11",
    href: "https://athenaintelligence.ai?ref=assistant-ui",
  },
  {
    src: "/icons/cust/browseruse.svg",
    alt: "Browseruse",
    height: "h-6",
    href: "https://browser-use.com/?ref=assistant-ui",
  },
  {
    src: "/icons/cust/stack.svg",
    alt: "Stack",
    height: "h-5",
    href: "https://stack-ai.com?ref=assistant-ui",
  },
] as const;

function LogoList() {
  return (
    <>
      {LOGOS.map((logo) => (
        <Link
          key={logo.alt}
          href={logo.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src={logo.src}
            alt={logo.alt}
            width={100}
            height={44}
            className={cn(
              "w-auto shrink-0 opacity-40 invert transition-opacity hover:opacity-100 dark:invert-0",
              logo.height,
            )}
          />
        </Link>
      ))}
    </>
  );
}

export function TrustedBy() {
  const isMobile = useMediaQuery("(max-width: 1080px)");

  return (
    <section className="flex flex-col items-center gap-4">
      {isMobile ? (
        <div className="flex w-full gap-(--gap) overflow-hidden [--duration:20s] [--gap:3rem]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex shrink-0 animate-marquee items-center justify-around gap-(--gap)"
            >
              <LogoList />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex w-full items-center justify-around">
          <LogoList />
        </div>
      )}
      <p className="text-muted-foreground text-sm">and teams everywhere</p>
    </section>
  );
}
