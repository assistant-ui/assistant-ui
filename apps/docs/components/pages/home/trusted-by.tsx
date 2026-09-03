"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Logo = {
  src: string;
  alt: string;
  href: string;
  invert?: boolean;
  darkSrc?: string;
};

const LOGOS: Logo[] = [
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
    src: "/icons/cust/aws.svg",
    darkSrc: "/icons/cust/aws-white.svg",
    alt: "AWS",
    href: "https://aws.amazon.com?ref=assistant-ui",
  },
  {
    src: "/icons/cust/neon.svg",
    darkSrc: "/icons/cust/neon-dark.svg",
    alt: "Neon",
    href: "https://neon.tech?ref=assistant-ui",
    invert: false,
  },
  {
    src: "/icons/yc_logo.png",
    alt: "Y Combinator",
    href: "https://www.ycombinator.com/companies/assistant-ui",
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
export const ALL_SLOTS = Array.from({ length: SLOTS }, (_, index) => index);
export const MOBILE_SLOTS = [0, 1, 2, 5, 6, 7];
const HOLD_MIN_MS = 1600;
const HOLD_SPAN_MS = 900;
const CROSSFADE_MS = 500;

function shuffle(slots: readonly number[]) {
  const order = slots.slice();
  for (let index = order.length - 1; index > 0; index -= 1) {
    const pick = Math.floor(Math.random() * (index + 1));
    [order[index], order[pick]] = [order[pick]!, order[index]!];
  }
  return order;
}

export function takeSlot(queue: readonly number[], visible: readonly number[]) {
  const remaining = queue.filter((slot) => visible.includes(slot));
  const source = remaining.length > 0 ? remaining : shuffle(visible);
  return { slot: source[source.length - 1]!, queue: source.slice(0, -1) };
}

export function rotateSlot(
  catalogue: readonly Logo[],
  shown: readonly Logo[],
  visible: readonly number[],
  target: number,
  pick: (count: number) => number,
): readonly Logo[] {
  const onScreen = new Set(visible.map((slot) => shown[slot]!.alt));
  const pool = catalogue.filter((logo) => !onScreen.has(logo.alt));
  const next = pool[pick(pool.length)];
  if (!next) return shown;
  // A logo parked in a slot the narrow layout hides is in the pool, so it trades
  // places with the outgoing one; that keeps all nine distinct at every breakpoint.
  const parked = shown.findIndex((logo) => logo.alt === next.alt);
  const outgoing = shown[target]!;
  return shown.map((logo, index) =>
    index === target ? next : index === parked ? outgoing : logo,
  );
}

type SlotState = {
  current: Logo;
  previous: Logo | null;
  entered: boolean;
};

// A slot adopts the incoming logo outright when it is not painting a cross fade:
// a hidden slot never loads its images, and a breakpoint change would otherwise
// reveal a stale layer holding a logo another slot now shows.
export function slotState(
  state: SlotState,
  logo: Logo,
  layout: { hidden: boolean; changed: boolean },
): SlotState {
  if (layout.hidden || layout.changed) {
    return { current: logo, previous: null, entered: true };
  }
  if (logo.alt === state.current.alt) return state;
  return {
    current: logo,
    previous: state.entered ? state.current : state.previous,
    entered: false,
  };
}

function LogoMark({
  logo,
  onSettle,
}: {
  logo: Logo;
  onSettle?: (() => void) | undefined;
}) {
  return (
    <>
      <Image
        src={logo.src}
        alt={logo.alt}
        width={120}
        height={24}
        onLoad={onSettle}
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
          onLoad={onSettle}
          className="hidden h-6 w-auto max-w-full object-contain opacity-40 transition-opacity duration-150 ease-out hover:opacity-100 dark:block"
        />
      ) : null}
    </>
  );
}

function LogoSlot({
  logo,
  hideOnMobile,
  wide,
}: {
  logo: Logo;
  hideOnMobile: boolean;
  wide: boolean;
}) {
  const [current, setCurrent] = useState(logo);
  const [previous, setPrevious] = useState<Logo | null>(null);
  const [entered, setEntered] = useState(true);
  const [wasWide, setWasWide] = useState(wide);
  const mark = useRef<HTMLAnchorElement>(null);

  // Readiness only counts rendered images: the theme-hidden half of a light/dark
  // pair is display:none, and a lazy image in that state never loads. Nothing
  // reports failure either, because the only caller is a rendered image's own
  // onLoad, so a logo that fails to load simply never becomes ready.
  const settle = () => {
    for (const image of mark.current?.querySelectorAll("img") ?? []) {
      if (getComputedStyle(image).display === "none") continue;
      if (!image.complete) return;
    }
    setEntered(true);
  };

  if (wasWide !== wide) setWasWide(wide);
  const next = slotState({ current, previous, entered }, logo, {
    hidden: hideOnMobile && !wide,
    changed: wasWide !== wide,
  });
  if (next.current !== current) setCurrent(next.current);
  if (next.previous !== previous) setPrevious(next.previous);
  if (next.entered !== entered) setEntered(next.entered);

  useEffect(() => {
    if (previous === null || !entered) return;
    const drop = window.setTimeout(() => setPrevious(null), CROSSFADE_MS + 100);
    return () => window.clearTimeout(drop);
  }, [entered, previous]);

  return (
    <div
      className={cn(
        "relative flex h-8 w-full items-center justify-center",
        hideOnMobile && "hidden sm:flex",
      )}
    >
      {previous ? (
        <Link
          key={previous.alt}
          href={previous.href}
          target="_blank"
          rel="noopener noreferrer"
          inert={entered}
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            entered &&
              "animate-out fade-out fill-mode-forwards duration-500 ease-out",
          )}
        >
          <LogoMark logo={previous} />
        </Link>
      ) : null}
      <Link
        key={current.alt}
        ref={mark}
        href={current.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex h-8 w-full max-w-[9rem] items-center justify-center",
          previous !== null &&
            (entered
              ? "animate-in fade-in duration-500 ease-out"
              : "opacity-0"),
        )}
        inert={previous !== null && !entered}
      >
        <LogoMark logo={current} onSettle={settle} />
      </Link>
    </div>
  );
}

export function TrustedBy() {
  const [shown, setShown] = useState<readonly Logo[]>(() =>
    LOGOS.slice(0, SLOTS),
  );
  const [hovered, setHovered] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [wide, setWide] = useState(true);
  const order = useRef<number[]>([]);
  const frozen = reduceMotion || hovered || pageHidden;
  const slots = wide ? ALL_SLOTS : MOBILE_SLOTS;

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 640px)");
    const applyMotion = () => setReduceMotion(motion.matches);
    const applyWide = () => setWide(desktop.matches);
    applyMotion();
    applyWide();
    motion.addEventListener("change", applyMotion);
    desktop.addEventListener("change", applyWide);

    const applyVisibility = () => setPageHidden(document.hidden);
    applyVisibility();
    document.addEventListener("visibilitychange", applyVisibility);

    return () => {
      motion.removeEventListener("change", applyMotion);
      desktop.removeEventListener("change", applyWide);
      document.removeEventListener("visibilitychange", applyVisibility);
    };
  }, []);

  useEffect(() => {
    if (frozen) return;
    const wait = HOLD_MIN_MS + Math.random() * HOLD_SPAN_MS;
    const hold = window.setTimeout(() => {
      const taken = takeSlot(order.current, slots);
      order.current = taken.queue;
      setShown((current) =>
        rotateSlot(LOGOS, current, slots, taken.slot, (count) =>
          Math.floor(Math.random() * count),
        ),
      );
    }, wait);
    return () => window.clearTimeout(hold);
  }, [frozen, shown, slots]);

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
            hideOnMobile={!MOBILE_SLOTS.includes(index)}
            wide={wide}
          />
        ))}
      </div>
      <div className="mx-auto grid w-full grid-cols-3 sm:w-4/5 sm:grid-cols-4">
        {shown.slice(5, SLOTS).map((logo, offset) => (
          <LogoSlot
            key={offset + 5}
            logo={logo}
            hideOnMobile={!MOBILE_SLOTS.includes(offset + 5)}
            wide={wide}
          />
        ))}
      </div>
    </div>
  );
}
