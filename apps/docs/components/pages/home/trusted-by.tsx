"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type TransitionEvent } from "react";

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
    src: "/icons/yc_logo.png",
    alt: "Y Combinator",
    href: "https://www.ycombinator.com/companies/assistant-ui",
    invert: false,
  },
  {
    src: "/icons/cust/neon.svg",
    darkSrc: "/icons/cust/neon-dark.svg",
    alt: "Neon",
    href: "https://neon.tech?ref=assistant-ui",
    invert: false,
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
    src: "/icons/cust/athenaintel.svg",
    alt: "Athena Intelligence",
    href: "https://athenaintel.com?ref=assistant-ui",
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
  {
    src: "/icons/cust/salesforce.svg",
    alt: "Salesforce",
    href: "https://www.salesforce.com?ref=assistant-ui",
    invert: false,
  },
  {
    src: "/icons/cust/vtex.svg",
    alt: "VTEX",
    href: "https://vtex.com?ref=assistant-ui",
    invert: false,
  },
  {
    src: "/icons/cust/onlyoffice.svg",
    alt: "ONLYOFFICE",
    href: "https://www.onlyoffice.com?ref=assistant-ui",
  },
  {
    src: "/icons/cust/agentops.svg",
    alt: "AgentOps",
    href: "https://agentops.ai?ref=assistant-ui",
  },
  {
    src: "/icons/cust/openops.svg",
    alt: "OpenOps",
    href: "https://www.openops.com?ref=assistant-ui",
  },
  {
    src: "/icons/cust/thesys.svg",
    alt: "Thesys",
    href: "https://www.thesys.dev?ref=assistant-ui",
  },
  {
    src: "/icons/cust/helicone.svg",
    alt: "Helicone",
    href: "https://www.helicone.ai?ref=assistant-ui",
  },
  {
    src: "/icons/cust/voltagent.png",
    alt: "VoltAgent",
    href: "https://voltagent.dev?ref=assistant-ui",
    invert: false,
  },
  {
    src: "/icons/cust/memobase.svg",
    alt: "Memobase",
    href: "https://www.memobase.io?ref=assistant-ui",
  },
];

const SLOTS = 9;
const HOLD_MIN_MS = 900;
const HOLD_SPAN_MS = 700;

function LogoMark({ logo }: { logo: (typeof LOGOS)[number] }) {
  return (
    <Link
      href={logo.href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-8 w-full max-w-[9rem] items-center justify-center"
    >
      <Image
        src={logo.src}
        alt={logo.alt}
        width={120}
        height={24}
        className={cn(
          "h-6 w-auto max-w-full object-contain opacity-40 transition-opacity duration-150 ease-out hover:opacity-100",
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
          className="hidden h-6 w-auto max-w-full object-contain opacity-40 transition-opacity duration-150 ease-out hover:opacity-100 dark:block"
        />
      ) : null}
    </Link>
  );
}

function LogoSlot({
  logo,
  index,
  lit,
  reduceMotion,
  hideOnMobile,
  onFadeEnd,
}: {
  logo: (typeof LOGOS)[number];
  index: number;
  lit: boolean;
  reduceMotion: boolean;
  hideOnMobile: boolean;
  onFadeEnd: (index: number, event: TransitionEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={cn(
        "flex h-8 w-full items-center justify-center",
        hideOnMobile && "hidden sm:flex",
        !reduceMotion && "transition-opacity ease-out",
        !reduceMotion &&
          (lit ? "opacity-100 duration-500" : "opacity-0 duration-300"),
      )}
      onTransitionEnd={(event) => onFadeEnd(index, event)}
    >
      <LogoMark logo={logo} />
    </div>
  );
}

export function TrustedBy() {
  const [shown, setShown] = useState(() => LOGOS.slice(0, SLOTS));
  const [lit, setLit] = useState(() =>
    Array.from({ length: SLOTS }, () => true),
  );
  const [fading, setFading] = useState<number | null>(null);
  const [pendingIn, setPendingIn] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [slotCount, setSlotCount] = useState(SLOTS);
  const frozen = reduceMotion || hovered || pageHidden;

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia("(min-width: 640px)");
    const applyMotion = () => setReduceMotion(motion.matches);
    const applyWide = () => setSlotCount(wide.matches ? SLOTS : 6);
    applyMotion();
    applyWide();
    motion.addEventListener("change", applyMotion);
    wide.addEventListener("change", applyWide);

    const applyVisibility = () => setPageHidden(document.hidden);
    applyVisibility();
    document.addEventListener("visibilitychange", applyVisibility);

    return () => {
      motion.removeEventListener("change", applyMotion);
      wide.removeEventListener("change", applyWide);
      document.removeEventListener("visibilitychange", applyVisibility);
    };
  }, []);

  useEffect(() => {
    if (pendingIn === null) return;
    const frame = window.requestAnimationFrame(() => {
      setLit((current) =>
        current.map((on, index) => (index === pendingIn ? true : on)),
      );
      setPendingIn(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingIn]);

  useEffect(() => {
    if (frozen || fading !== null || pendingIn !== null) return;
    const wait = HOLD_MIN_MS + Math.random() * HOLD_SPAN_MS;
    const hold = window.setTimeout(() => {
      setFading(Math.floor(Math.random() * slotCount));
    }, wait);
    return () => window.clearTimeout(hold);
  }, [fading, frozen, pendingIn, shown, slotCount]);

  useEffect(() => {
    if (fading === null) return;
    setLit((current) => {
      if (!current[fading]) return current;
      return current.map((on, index) => (index === fading ? false : on));
    });
  }, [fading]);

  useEffect(() => {
    if (fading === null) return;
    const fallback = window.setTimeout(() => {
      setLit((current) =>
        current.map((on, index) => (index === fading ? true : on)),
      );
      setFading(null);
    }, 900);
    return () => window.clearTimeout(fallback);
  }, [fading]);

  const handleSlotFadeEnd = (
    index: number,
    event: TransitionEvent<HTMLDivElement>,
  ) => {
    if (event.propertyName !== "opacity") return;
    if (event.target !== event.currentTarget) return;
    if (lit[index]) {
      if (fading === index) setFading(null);
      return;
    }
    setShown((current) => {
      const leaving = current[index]!;
      const used = new Set(
        current.filter((_, slot) => slot !== index).map((logo) => logo.alt),
      );
      const pool = LOGOS.filter(
        (logo) => !used.has(logo.alt) && logo.alt !== leaving.alt,
      );
      const next = pool[Math.floor(Math.random() * pool.length)] ?? leaving;
      return current.map((logo, slot) => (slot === index ? next : logo));
    });
    setPendingIn(index);
  };

  return (
    <div
      className="flex flex-col gap-8"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="grid w-full grid-cols-3 sm:grid-cols-5">
        {shown.slice(0, 5).map((logo, index) => (
          <LogoSlot
            key={index}
            logo={logo}
            index={index}
            lit={lit[index]!}
            reduceMotion={reduceMotion}
            hideOnMobile={index >= 3}
            onFadeEnd={handleSlotFadeEnd}
          />
        ))}
      </div>
      <div className="mx-auto grid w-full grid-cols-3 sm:w-4/5 sm:grid-cols-4">
        {shown.slice(5, 9).map((logo, offset) => {
          const index = offset + 5;
          return (
            <LogoSlot
              key={index}
              logo={logo}
              index={index}
              lit={lit[index]!}
              reduceMotion={reduceMotion}
              hideOnMobile={index >= 8}
              onFadeEnd={handleSlotFadeEnd}
            />
          );
        })}
      </div>
    </div>
  );
}
