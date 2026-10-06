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
 * below it, which would otherwise hand the active tick to the turn before.
 */
const TOP_TOLERANCE = 1;

const sameIds = (a: readonly string[], b: readonly string[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

/**
 * The line a message has to cross to count as the one being read. It sits at
 * the top of the viewport for most of a thread, then slides to the bottom
 * across the final screenful: a message that starts within one viewport height
 * of the end can never reach the top, so a fixed line leaves the last screen's
 * worth of ticks permanently unreachable.
 */
const readingLine = (viewport: HTMLElement) => {
  const rect = viewport.getBoundingClientRect();
  const height = viewport.clientHeight;
  if (height <= 0) return rect.top + TOP_TOLERANCE;

  const remaining = viewport.scrollHeight - height - viewport.scrollTop;
  const descent = Math.min(1, Math.max(0, (height - remaining) / height));
  return rect.top + rect.height * descent + TOP_TOLERANCE;
};

type MessageSummary = {
  hasText: boolean;
  title: string;
  answerPreview: string;
  questionPreview: string;
};

/** Cuts on a word boundary so a title never splits a word. */
const cutAtWord = (text: string, limit: number) => {
  if (text.length <= limit) return text;
  const head = text.slice(0, limit);
  const boundary = head.lastIndexOf(" ");
  return boundary > limit / 2 ? head.slice(0, boundary) : head;
};

const summarizeMessage = (message: ThreadMessage): MessageSummary => {
  const content = message.content;
  const textParts: string[] = [];
  const tools: string[] = [];
  let hasReasoning = false;
  let hasImage = false;
  let hasFile = false;

  for (const part of content) {
    switch (part.type) {
      case "text":
        textParts.push(part.text);
        break;
      case "tool-call":
        tools.push(part.toolName);
        break;
      case "reasoning":
        hasReasoning = true;
        break;
      case "image":
        hasImage = true;
        break;
      case "file":
        hasFile = true;
        break;
    }
  }

  // A composer submission carries its files in `attachments` and leaves
  // `content` empty, so both places decide an attachment-only turn's label.
  const attachments = message.attachments ?? [];
  for (const attachment of attachments) {
    if (attachment.type === "image") hasImage = true;
    if (attachment.type === "file") hasFile = true;
  }

  const text = textParts.join("\n").trim();
  const lines = text
    .split("\n")
    .map((line) => line.replace(/^[\s#>*`-]+/, "").trim())
    .filter(Boolean);

  let label: string;
  if (tools.length === 1) label = tools[0]!;
  else if (tools.length > 1) label = `${tools.length} tool calls`;
  else if (hasReasoning) label = "Reasoning";
  else if (hasImage) label = "Image";
  else if (hasFile) label = "File";
  else if (content.length + attachments.length > 0) label = "Attachment";
  else label = message.role === "user" ? "Message" : "Response";

  const first = lines[0] ?? "";
  const title = cutAtWord(first, TITLE_LENGTH);
  return {
    hasText: text.length > 0,
    title: title || label,
    answerPreview: lines.join(" ").trim().slice(0, PREVIEW_LENGTH),
    questionPreview: [first.slice(title.length), ...lines.slice(1)]
      .join(" ")
      .trim()
      .slice(0, PREVIEW_LENGTH),
  };
};

const summaries = new WeakMap<ThreadMessage, MessageSummary>();

const summaryOf = (message: ThreadMessage) => {
  let summary = summaries.get(message);
  if (!summary) {
    summary = summarizeMessage(message);
    summaries.set(message, summary);
  }
  return summary;
};

/** A user message and the assistant messages answering it. */
type Turn = {
  head: ThreadMessage;
  members: ThreadMessage[];
};

const groupIntoTurns = (messages: readonly ThreadMessage[]) => {
  const turns: Turn[] = [];
  for (const message of messages) {
    if (message.role !== "user" && message.role !== "assistant") continue;
    const current = turns.at(-1);
    if (message.role === "user" || !current) {
      turns.push({ head: message, members: [message] });
    } else {
      current.members.push(message);
    }
  }
  return turns;
};

const describe = ({ head, members }: Turn): ConversationMapEntry => {
  const headSummary = summaryOf(head);

  // What the turn asked names it; what it answered is the useful preview, and
  // a turn still being answered falls back to the rest of its own text.
  const answer = members.find(
    (member) => member !== head && summaryOf(member).hasText,
  );
  const preview = answer
    ? summaryOf(answer).answerPreview
    : headSummary.questionPreview;

  return {
    id: head.id,
    title: headSummary.title,
    ...(preview ? { preview } : {}),
  };
};

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
  const [visibleIds, setVisibleIds] = useState<readonly string[]>([]);
  const scheduleRef = useRef<(() => void) | undefined>(undefined);

  const turns = useMemo(() => groupIntoTurns(messages), [messages]);
  const entries = useMemo(() => turns.map(describe), [turns]);

  /** Which turn each message belongs to, so a message in view marks its turn. */
  const turnOf = useMemo(() => {
    const owners = new Map<string, string>();
    for (const turn of turns) {
      for (const member of turn.members) owners.set(member.id, turn.head.id);
    }
    return owners;
  }, [turns]);

  const turnOfRef = useRef(turnOf);
  const turnKey = turns.map((turn) => turn.head.id).join(" ");

  useEffect(() => {
    turnOfRef.current = turnOf;
  });

  useEffect(() => {
    if (!viewport) return undefined;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const owners = turnOfRef.current;
      const view = viewport.getBoundingClientRect();
      const line = readingLine(viewport);

      // One pass yields both facts the rail draws: which turn is being read,
      // and which turns the viewport currently holds.
      let current: string | undefined;
      const onScreen: string[] = [];
      for (const element of viewport.querySelectorAll<HTMLElement>(
        "[data-message-id]",
      )) {
        const box = element.getBoundingClientRect();
        if (box.top >= view.bottom) break;

        const id = element.dataset["messageId"];
        const head = id === undefined ? undefined : owners.get(id);
        if (head === undefined) continue;

        if (box.top <= line) current = head;
        if (box.bottom > view.top && !onScreen.includes(head)) {
          onScreen.push(head);
        }
      }

      setActiveId(current ?? owners.values().next().value);
      setVisibleIds((previous) =>
        sameIds(previous, onScreen) ? previous : onScreen,
      );
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
  }, [turnKey]);

  const select = useCallback(
    (id: string) => {
      if (!viewport) return;
      for (const element of viewport.querySelectorAll<HTMLElement>(
        "[data-message-id]",
      )) {
        if (element.dataset["messageId"] !== id) continue;

        // `scrollIntoView` aligns every scrollable ancestor, which drags the
        // page a thread is embedded in; only this viewport should move.
        const top =
          element.getBoundingClientRect().top -
          viewport.getBoundingClientRect().top +
          viewport.scrollTop;
        viewport.scrollTo({ top, behavior: "smooth" });
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
          visibleIds={visibleIds}
          onSelect={select}
          side={side === "right" ? "left" : "right"}
        />
      </div>
    </div>
  );
}
