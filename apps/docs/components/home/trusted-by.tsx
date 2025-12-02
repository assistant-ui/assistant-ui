"use client";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/useMediaQuery";
import Image from "next/image";

const LOGOS = [
  { src: "/logos/cust/langchain.svg", alt: "Langchain", height: "h-7" },
  {
    src: "/logos/cust/athenaintel.png",
    alt: "Athena Intelligence",
    height: "h-11",
  },
  { src: "/logos/cust/browseruse.svg", alt: "Browseruse", height: "h-6" },
  { src: "/logos/cust/stack.svg", alt: "Stack", height: "h-5" },
] as const;

function LogoList() {
  return (
    <>
      {LOGOS.map((logo) => (
        <Image
          key={logo.alt}
          src={logo.src}
          alt={logo.alt}
          width={100}
          height={44}
          className={cn(
            "w-auto shrink-0 opacity-50 invert transition-opacity hover:opacity-100 dark:invert-0",
            logo.height,
          )}
        />
      ))}
    </>
  );
}

export function TrustedBy() {
  const isMobile = useMediaQuery("(max-width: 1080px)");

  return (
    <section className="flex flex-col items-center gap-3">
      <h2 className="text-center font-medium text-3xl tracking-tight">
        Trusted by fast-growing companies
      </h2>
      {isMobile ? (
        <div className="flex w-full overflow-hidden [--duration:20s] [--gap:3rem]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex shrink-0 animate-marquee items-center justify-around gap-[var(--gap)]"
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
    </section>
  );
}
