"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuiState, useThreadViewport } from "@assistant-ui/react";
import type { ThreadMessage } from "@assistant-ui/react";
import { cn } from "@/lib/utils";
import { ConversationMap, type ConversationMapEntry } from "./conversation-map";

const TITLE_LENGTH = 72;
const PREVIEW_LENGTH = 240;

/**
 * A message scrolled to the top of the viewport lands a fraction of a pixel
 * below it, which would otherwise hand the active tick to the message before.
 */
const TOP_TOLERANCE = 1;

const partsOf = (message: ThreadMessage) => [...message.content];

const textOf = (message: ThreadMessage) =>
  partsOf(message)
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("\n")
    .trim();

const labelOf = (message: ThreadMessage) => {
  const parts = partsOf(message);
  const tools = parts.flatMap((part) =>
    part.type === "tool-call" ? [part.toolName] : [],
  );
  if (tools.length === 1) return tools[0]!;
  if (tools.length > 1) return `${tools.length} tool calls`;
  if (parts.some((part) => part.type === "reasoning")) return "Reasoning";
  if (parts.some((part) => part.type === "image")) return "Image";
  if (parts.some((part) => part.type === "file")) return "File";
  return message.role === "user" ? "Message" : "Response";
};

/** Cuts on a word boundary so the title and the preview it continues into never split a word. */
const cutAtWord = (text: string, limit: number) => {
  if (text.length <= limit) return text;
  const head = text.slice(0, limit);
  const boundary = head.lastIndexOf(" ");
  return boundary > limit / 2 ? head.slice(0, boundary) : head;
};

const describe = (message: ThreadMessage): ConversationMapEntry | null => {
  if (message.role !== "user" && message.role !== "assistant") return null;

  const lines = textOf(message)
    .split("\n")
    .map((line) => line.replace(/^[\s#>*`-]+/, "").trim())
    .filter(Boolean);

  const first = lines[0] ?? "";
  const title = cutAtWord(first, TITLE_LENGTH);
  const preview = [first.slice(title.length), ...lines.slice(1)]
    .join(" ")
    .trim()
    .slice(0, PREVIEW_LENGTH);

  return {
    id: message.id,
    role: message.role,
    title: title || labelOf(message),
    ...(preview ? { preview } : {}),
  };
};

/**
 * Renders inside `ThreadPrimitive.Viewport`, as a direct child rather than
 * inside the centered message column, so the rail lands in the gutter.
 */
export function ConversationMapAui({
  side = "left",
  className,
}: {
  side?: "left" | "right";
  className?: string;
}) {
  const messages = useAuiState((s) => s.thread.messages);
  const viewport = useThreadViewport((s) => s.element.viewport);
  const viewportHeight = useThreadViewport((s) => s.height.viewport);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const scheduleRef = useRef<(() => void) | undefined>(undefined);

  const entries = useMemo(
    () => messages.map(describe).filter((entry) => entry !== null),
    [messages],
  );

  useEffect(() => {
    if (!viewport) return undefined;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = viewport.getBoundingClientRect().top + TOP_TOLERANCE;
      const elements =
        viewport.querySelectorAll<HTMLElement>("[data-message-id]");
      let found: string | undefined;
      for (const element of elements) {
        if (element.getBoundingClientRect().top > line) break;
        found = element.dataset["messageId"];
      }
      setActiveId(found ?? elements[0]?.dataset["messageId"]);
    };
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    scheduleRef.current = schedule;
    schedule();
    viewport.addEventListener("scroll", schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    observer.observe(viewport);

    return () => {
      scheduleRef.current = undefined;
      if (frame) cancelAnimationFrame(frame);
      viewport.removeEventListener("scroll", schedule);
      observer.disconnect();
    };
  }, [viewport]);

  useEffect(() => {
    scheduleRef.current?.();
  }, [entries]);

  const select = useCallback(
    (id: string) => {
      if (!viewport) return;
      for (const element of viewport.querySelectorAll<HTMLElement>(
        "[data-message-id]",
      )) {
        if (element.dataset["messageId"] !== id) continue;
        element.scrollIntoView({ block: "start", behavior: "smooth" });
        return;
      }
    },
    [viewport],
  );

  return (
    <div
      data-slot="conversation-map-rail"
      className={cn(
        "pointer-events-none sticky top-0 z-10 h-0 w-full",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-auto absolute top-0 px-3 py-10",
          side === "right" ? "right-0" : "left-0",
        )}
        style={{ height: viewportHeight }}
      >
        <ConversationMap
          entries={entries}
          activeId={activeId}
          onSelect={select}
          side={side === "right" ? "left" : "right"}
        />
      </div>
    </div>
  );
}
