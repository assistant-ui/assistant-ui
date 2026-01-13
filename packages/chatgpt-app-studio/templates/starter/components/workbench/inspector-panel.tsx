"use client";

import { useCallback, useState } from "react";
import { EventConsole } from "./event-console";
import { useConsoleLogs, useClearConsole } from "@/lib/workbench/store";
import { Button } from "@/components/ui/button";
import { Terminal, Trash2, ArrowDownToLine, Copy, Check } from "lucide-react";
import type { ConsoleEntry, ConsoleEntryType } from "@/lib/workbench/types";

function formatTimestamp(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  const s = date.getSeconds().toString().padStart(2, "0");
  const ms = date.getMilliseconds().toString().padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
}

function formatEntryForCopy(entry: ConsoleEntry): string {
  const parts = [
    `[${formatTimestamp(entry.timestamp)}]`,
    entry.method,
    entry.args !== undefined ? JSON.stringify(entry.args, null, 2) : "",
    entry.result !== undefined
      ? `→ ${JSON.stringify(entry.result, null, 2)}`
      : "",
  ];
  return parts.filter(Boolean).join(" ");
}

export function InspectorPanel() {
  const consoleLogs = useConsoleLogs();
  const clearConsole = useClearConsole();
  const [typeFilter, setTypeFilter] = useState<ConsoleEntryType | "all">("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const [scrollToBottomTrigger, setScrollToBottomTrigger] = useState(0);
  const [copied, setCopied] = useState(false);

  const uniqueTypes = Array.from(new Set(consoleLogs.map((e) => e.type)));
  const filteredLogs =
    typeFilter === "all"
      ? consoleLogs
      : consoleLogs.filter((entry) => entry.type === typeFilter);

  const handleScrollToBottom = () => {
    setScrollToBottomTrigger((t) => t + 1);
    setAutoScroll(true);
  };

  const handleCopyAll = useCallback(async () => {
    const text = consoleLogs.map(formatEntryForCopy).join("\n\n");
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
  }, [consoleLogs]);

  return (
    <div className="flex h-full flex-col bg-neutral-100 dark:bg-neutral-950">
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <div className="flex items-center gap-1.5">
            <Terminal className="size-3.5" />
            Console
          </div>
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as ConsoleEntryType | "all")
            }
            className="h-6 rounded-md border-0 bg-muted pr-6 pl-2 text-foreground text-xs"
          >
            <option value="all">All</option>
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          {!autoScroll && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-muted-foreground text-xs hover:text-foreground"
              onClick={handleScrollToBottom}
              title="Scroll to bottom"
            >
              <ArrowDownToLine className="size-3" />
            </Button>
          )}
          {consoleLogs.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-muted-foreground text-xs hover:text-foreground"
                onClick={handleCopyAll}
                title="Copy all logs"
              >
                {copied ? (
                  <Check className="size-3" />
                ) : (
                  <Copy className="size-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-muted-foreground text-xs hover:text-foreground"
                onClick={clearConsole}
                title="Clear console"
              >
                <Trash2 className="size-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      <EventConsole
        logs={filteredLogs}
        autoScroll={autoScroll}
        onAutoScrollChange={setAutoScroll}
        scrollToBottomTrigger={scrollToBottomTrigger}
      />
    </div>
  );
}
