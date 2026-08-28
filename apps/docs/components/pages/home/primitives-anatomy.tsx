"use client";

import { useEffect, useState } from "react";
import { ArrowDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const STEP_MS = 2800;

type PartId = "root" | "viewport" | "messages" | "scroll" | "composer";

const PARTS: { id: PartId; label: string; caption: string }[] = [
  {
    id: "root",
    label: "Root",
    caption: "Owns the runtime context. Everything composes inside.",
  },
  {
    id: "viewport",
    label: "Viewport",
    caption:
      "The scroll surface. Follows the stream until the user takes over.",
  },
  {
    id: "messages",
    label: "Messages",
    caption: "Renders every turn through your components, by role.",
  },
  {
    id: "scroll",
    label: "Scroll to bottom",
    caption: "Appears once you scroll away. One press back to live.",
  },
  {
    id: "composer",
    label: "Composer",
    caption: "Input, attachments, dictation, send.",
  },
];

const LINES: { text: string; part: PartId; indent: number }[] = [
  { text: "<ThreadPrimitive.Root>", part: "root", indent: 0 },
  { text: "<ThreadPrimitive.Viewport>", part: "viewport", indent: 1 },
  { text: "<ThreadPrimitive.Messages", part: "messages", indent: 2 },
  {
    text: "components={{ UserMessage, AssistantMessage }}",
    part: "messages",
    indent: 3,
  },
  { text: "/>", part: "messages", indent: 2 },
  { text: "<ThreadPrimitive.ScrollToBottom />", part: "scroll", indent: 2 },
  { text: "</ThreadPrimitive.Viewport>", part: "viewport", indent: 1 },
  { text: "<ComposerPrimitive.Root>", part: "composer", indent: 1 },
  { text: "<ComposerPrimitive.Input />", part: "composer", indent: 2 },
  { text: "<ComposerPrimitive.Send />", part: "composer", indent: 2 },
  { text: "</ComposerPrimitive.Root>", part: "composer", indent: 1 },
  { text: "</ThreadPrimitive.Root>", part: "root", indent: 0 },
];

function PartChip({ label }: { label: string }) {
  return (
    <span className="absolute -top-2.5 right-2 z-10 bg-blue-500 px-1.5 py-px font-mono text-[10px] font-medium tracking-wide text-white uppercase">
      {label}
    </span>
  );
}

function Region({
  part,
  active,
  className,
  children,
}: {
  part: PartId;
  active: PartId;
  className?: string;
  children?: React.ReactNode;
}) {
  const current = active === part;
  const label = PARTS.find((item) => item.id === part)!.label;
  return (
    <div
      className={cn(
        "relative transition-all duration-300",
        current ? "ring-1 ring-blue-500/70" : "opacity-80",
        className,
      )}
    >
      {current ? <PartChip label={label} /> : null}
      {children}
    </div>
  );
}

export function PrimitivesAnatomy() {
  const [active, setActive] = useState<PartId>("root");
  const [held, setHeld] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(motion.matches);
    apply();
    motion.addEventListener("change", apply);
    return () => motion.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (held || reduceMotion) return;
    const id = window.setTimeout(() => {
      setActive((current) => {
        const index = PARTS.findIndex((item) => item.id === current);
        return PARTS[(index + 1) % PARTS.length]!.id;
      });
    }, STEP_MS);
    return () => window.clearTimeout(id);
  }, [held, reduceMotion, active]);

  const activePart = PARTS.find((item) => item.id === active)!;

  return (
    <div
      className="bg-foreground/[0.025] dark:bg-foreground/[0.04] flex flex-col gap-6 px-6 py-8 md:px-10 md:py-10"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
    >
      <div className="grid gap-8 md:grid-cols-[minmax(0,38rem)_minmax(0,22rem)] md:justify-between md:gap-12">
        <div className="min-w-0 overflow-x-auto md:overflow-x-visible">
          <div className="flex flex-col font-mono text-[13px] leading-relaxed [font-variant-ligatures:none]">
            {LINES.map((line, index) => {
              const current = active === line.part;
              return (
                <button
                  key={index}
                  type="button"
                  aria-current={current}
                  onMouseEnter={() => setActive(line.part)}
                  onFocus={() => setActive(line.part)}
                  className={cn(
                    "-mx-2 flex whitespace-pre transition-colors duration-200",
                    current
                      ? "text-foreground bg-blue-500/8"
                      : "text-foreground/45 hover:text-foreground/75",
                  )}
                >
                  <span
                    className={cn(
                      "w-2 shrink-0 self-stretch transition-colors duration-200",
                      current ? "bg-blue-500" : "bg-transparent",
                    )}
                  />
                  <span className="pl-1.5">
                    {"  ".repeat(line.indent)}
                    {line.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Region
          part="root"
          active={active}
          className="bg-background border-foreground/10 flex h-full flex-col gap-0 border p-2"
        >
          <Region
            part="viewport"
            active={active}
            className="flex flex-1 flex-col gap-2.5 p-2 pb-3"
          >
            <Region
              part="messages"
              active={active}
              className="flex flex-col gap-2.5 p-1"
            >
              <div className="bg-foreground/[0.06] ml-auto h-6 w-24" />
              <div className="flex flex-col gap-1.5">
                <div className="bg-foreground/15 h-2 w-full" />
                <div className="bg-foreground/15 h-2 w-4/5" />
                <div className="bg-foreground/15 h-2 w-3/5" />
              </div>
              <div className="bg-foreground/[0.06] ml-auto h-6 w-32" />
              <div className="flex flex-col gap-1.5">
                <div className="bg-foreground/15 h-2 w-11/12" />
                <div className="bg-foreground/15 h-2 w-2/3" />
              </div>
            </Region>
            <Region
              part="scroll"
              active={active}
              className="border-foreground/20 bg-background mt-auto ml-auto grid size-6 place-items-center rounded-(--radius-capsule) border"
            >
              <ArrowDownIcon className="text-foreground/60 size-3" />
            </Region>
          </Region>
          <Region
            part="composer"
            active={active}
            className="border-foreground/15 flex items-center justify-between border px-2.5 py-2"
          >
            <div className="bg-foreground/20 h-1.5 w-16" />
            <div className="bg-foreground/80 size-4 rounded-(--radius-capsule)" />
          </Region>
        </Region>
      </div>

      <p
        key={active}
        className="animate-in fade-in-0 text-muted-foreground font-mono text-[11px] tracking-wide duration-500 motion-reduce:animate-none"
      >
        {activePart.label} · {activePart.caption}
      </p>
    </div>
  );
}
