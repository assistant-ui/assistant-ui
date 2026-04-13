"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConsoleEntry, ConsoleEntryType } from "@/lib/workbench/types";
import { cn } from "@/lib/ui/cn";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const typeColors: Record<ConsoleEntryType, string> = {
  callTool: "text-blue-600 dark:text-blue-400",
  setWidgetState: "text-green-600 dark:text-green-400",
  requestDisplayMode: "text-purple-600 dark:text-purple-400",
  sendFollowUpMessage: "text-orange-600 dark:text-orange-400",
  requestClose: "text-neutral-500 dark:text-neutral-400",
  openExternal: "text-neutral-500 dark:text-neutral-400",
  notifyIntrinsicHeight: "text-teal-600 dark:text-teal-400",
  requestModal: "text-pink-600 dark:text-pink-400",
  uploadFile: "text-amber-600 dark:text-amber-400",
  getFileDownloadUrl: "text-amber-600 dark:text-amber-400",
  event: "text-cyan-600 dark:text-cyan-400",
};

function formatTimestamp(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  const s = date.getSeconds().toString().padStart(2, "0");
  const ms = date.getMilliseconds().toString().padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}

function formatValueCompact(value: unknown): string {
  if (value === undefined) return "";
  try {
    const str = JSON.stringify(value);
    if (str.length > 80) {
      return `${str.slice(0, 80)}…`;
    }
    return str;
  } catch {
    return String(value);
  }
}

function formatValueFull(value: unknown): string {
  if (value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isExpandable(value: unknown): boolean {
  if (value === undefined) return false;
  try {
    const str = JSON.stringify(value);
    return str.length > 80;
  } catch {
    return false;
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    },
    [text],
  );

  return (
    <button
      onClick={handleCopy}
      className="rounded p-1 text-muted-foreground opacity-0 transition-all hover:text-foreground group-hover:opacity-100"
      title="Copy to clipboard"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

interface ConsoleEntryRowProps {
  entry: ConsoleEntry;
  onExpand?: () => void;
}

function ConsoleEntryRow({ entry, onExpand }: ConsoleEntryRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const hasExpandableContent =
    isExpandable(entry.args) || isExpandable(entry.result);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      onExpand?.();
      requestAnimationFrame(() => {
        rowRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const getFullEntryText = () => {
    const parts = [
      `[${formatTimestamp(entry.timestamp)}]`,
      entry.method,
      entry.args !== undefined ? formatValueFull(entry.args) : "",
      entry.result !== undefined ? `→ ${formatValueFull(entry.result)}` : "",
    ];
    return parts.filter(Boolean).join(" ");
  };

  if (!hasExpandableContent) {
    return (
      <div className="group flex items-center gap-2 px-3 py-2 transition-colors hover:bg-muted/50">
        <div className="size-4 shrink-0" />
        <span className="shrink-0 text-muted-foreground tabular-nums">
          [{formatTimestamp(entry.timestamp)}]
        </span>
        <span className={cn("shrink-0 font-medium", typeColors[entry.type])}>
          {entry.method}
        </span>
        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {entry.args !== undefined && formatValueCompact(entry.args)}
          {entry.result !== undefined && (
            <span className="text-emerald-600 dark:text-emerald-400">
              {" "}
              → {formatValueCompact(entry.result)}
            </span>
          )}
        </span>
        <div className="shrink-0">
          <CopyButton text={getFullEntryText()} />
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
      <div
        ref={rowRef}
        className="group relative transition-colors hover:bg-muted/50"
      >
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-2 px-3 py-2 pr-10 text-left">
            <span
              className={cn(
                "shrink-0 transition-colors",
                isOpen
                  ? "text-foreground"
                  : "text-muted-foreground/50 group-hover:text-foreground",
              )}
            >
              {isOpen ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </span>
            <span className="shrink-0 text-muted-foreground tabular-nums">
              [{formatTimestamp(entry.timestamp)}]
            </span>
            <span
              className={cn("shrink-0 font-medium", typeColors[entry.type])}
            >
              {entry.method}
            </span>
            {!isOpen && (
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {entry.args !== undefined && formatValueCompact(entry.args)}
                {entry.result !== undefined && (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {" "}
                    → {formatValueCompact(entry.result)}
                  </span>
                )}
              </span>
            )}
          </button>
        </CollapsibleTrigger>
        <div className="absolute top-2 right-3">
          <CopyButton text={getFullEntryText()} />
        </div>
        <CollapsibleContent>
          <div className="space-y-2 px-3 pb-2 pl-9">
            {entry.args !== undefined && (
              <pre className="overflow-x-auto text-muted-foreground text-xs leading-relaxed">
                {formatValueFull(entry.args)}
              </pre>
            )}
            {entry.result !== undefined && (
              <pre className="overflow-x-auto text-emerald-600 text-xs leading-relaxed dark:text-emerald-400">
                → {formatValueFull(entry.result)}
              </pre>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface EventConsoleProps {
  logs: ConsoleEntry[];
  autoScroll: boolean;
  onAutoScrollChange: (autoScroll: boolean) => void;
  scrollToBottomTrigger: number;
}

export function EventConsole({
  logs,
  autoScroll,
  onAutoScrollChange,
  scrollToBottomTrigger,
}: EventConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastLogCountRef = useRef(logs.length);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    onAutoScrollChange(isAtBottom);
  }, [onAutoScrollChange]);

  const handleEntryExpand = useCallback(() => {
    onAutoScrollChange(false);
  }, [onAutoScrollChange]);

  useEffect(() => {
    if (autoScroll && logs.length > lastLogCountRef.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
    lastLogCountRef.current = logs.length;
  }, [logs.length, autoScroll]);

  useEffect(() => {
    if (scrollToBottomTrigger > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [scrollToBottomTrigger]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto font-mono text-xs"
    >
      {logs.length === 0 ? (
        <div className="flex h-full flex-1 grow justify-center self-center px-4 pt-12 text-center text-muted-foreground opacity-70">
          Events will appear here when the component calls window methods
        </div>
      ) : (
        <div className="divide-y">
          {logs.map((entry) => (
            <ConsoleEntryRow
              key={entry.id}
              entry={entry}
              onExpand={handleEntryExpand}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
