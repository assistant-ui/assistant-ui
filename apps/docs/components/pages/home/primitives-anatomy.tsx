"use client";

import { Fragment, useState } from "react";
import { ArrowDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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

function PartChip({
  label,
  className,
}: {
  label: string;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "absolute -top-2.5 right-2 z-10 rounded-sm bg-blue-500 px-1.5 py-px font-mono text-[10px] font-medium text-white",
        className,
      )}
    >
      {label}
    </span>
  );
}

function Region({
  part,
  active,
  className,
  chipClassName,
  children,
}: {
  part: PartId;
  active: PartId;
  className?: string;
  chipClassName?: string | undefined;
  children?: React.ReactNode;
}) {
  const current = active === part;
  const label = PARTS.find((item) => item.id === part)!.label;
  return (
    <div
      className={cn(
        "relative rounded-sm transition-all duration-300",
        current ? "ring-1 ring-blue-500/70" : "opacity-80",
        className,
      )}
    >
      {current ? <PartChip label={label} className={chipClassName} /> : null}
      {children}
    </div>
  );
}

export function PrimitivesAnatomy() {
  const [active, setActive] = useState<PartId>("root");
  const activePart = PARTS.find((item) => item.id === active)!;

  return (
    <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document flex flex-col gap-6 px-6 py-8 md:px-10 md:py-10">
      <div
        role="group"
        aria-label="Thread primitives"
        className="flex flex-wrap gap-x-5 gap-y-1"
      >
        {PARTS.map((part) => (
          <button
            key={part.id}
            type="button"
            aria-pressed={active === part.id}
            onClick={() => setActive(part.id)}
            className={cn(
              "min-h-11 border-b-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4",
              active === part.id
                ? "border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {part.label}
          </button>
        ))}
      </div>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:items-stretch md:gap-10">
        <pre className="min-w-0 overflow-x-auto font-mono text-[13px] leading-relaxed [font-variant-ligatures:none]">
          <code>
            {LINES.map((line, index) => (
              <Fragment key={index}>
                <span
                  className={cn(
                    "inline-block w-full rounded-sm py-0.5 pr-3 pl-2 transition-colors motion-reduce:transition-none",
                    active === line.part
                      ? "text-foreground bg-blue-500/8"
                      : "text-muted-foreground",
                  )}
                >
                  {"  ".repeat(line.indent)}
                  {line.text}
                </span>
                {"\n"}
              </Fragment>
            ))}
          </code>
        </pre>

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
              <div className="bg-foreground/[0.06] ml-auto h-6 w-24 rounded-sm" />
              <div className="flex flex-col gap-1.5">
                <div className="bg-foreground/15 h-2 w-full rounded-sm" />
                <div className="bg-foreground/15 h-2 w-4/5 rounded-sm" />
                <div className="bg-foreground/15 h-2 w-3/5 rounded-sm" />
              </div>
              <div className="bg-foreground/[0.06] ml-auto h-6 w-32 rounded-sm" />
              <div className="flex flex-col gap-1.5">
                <div className="bg-foreground/15 h-2 w-11/12 rounded-sm" />
                <div className="bg-foreground/15 h-2 w-2/3 rounded-sm" />
              </div>
            </Region>
            <Region
              part="scroll"
              active={active}
              className="border-foreground/20 bg-background rounded-capsule mt-auto ml-auto grid size-6 place-items-center border"
              chipClassName="top-1/2 right-full mr-1.5 -translate-y-1/2 whitespace-nowrap"
            >
              <ArrowDownIcon className="text-foreground/60 size-3" />
            </Region>
          </Region>
          <Region
            part="composer"
            active={active}
            className="border-foreground/15 flex items-center justify-between border px-2.5 py-2"
          >
            <div className="bg-foreground/20 h-1.5 w-16 rounded-sm" />
            <div className="bg-foreground/80 rounded-capsule size-4" />
          </Region>
        </Region>
      </div>

      <p key={active} className="text-muted-foreground text-sm leading-relaxed">
        <span className="text-foreground font-medium">{activePart.label}.</span>{" "}
        {activePart.caption}
      </p>
    </div>
  );
}
