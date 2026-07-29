"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown, FileText } from "lucide-react";
import type { XuluxFileReference } from "@/lib/xulux/learn/file-reference";
import { cn } from "@/lib/utils";
import { LearnFileView } from "./LearnFileView";
import { useOptionalLearnMode } from "./LearnModeContext";
import { useOptionalLearnStageSource } from "./LearnStageSourceContext";

type LearnMessageFileContextValue = {
  activePath: string | null;
  toggle: (path: string) => void;
};

const LearnMessageFileContext =
  createContext<LearnMessageFileContextValue | null>(null);

export function LearnMessageFileProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activePath, setActivePath] = useState<string | null>(null);
  const value = useMemo<LearnMessageFileContextValue>(
    () => ({
      activePath,
      toggle: (path) =>
        setActivePath((current) => (current === path ? null : path)),
    }),
    [activePath],
  );

  return (
    <LearnMessageFileContext.Provider value={value}>
      {children}
    </LearnMessageFileContext.Provider>
  );
}

export function LearnInlineFileReference({
  reference,
  className,
}: {
  reference: XuluxFileReference;
  className?: string | undefined;
}) {
  const message = useContext(LearnMessageFileContext);
  const source = useOptionalLearnStageSource();
  const record =
    source?.status === "ready" ? source.records.get(reference.path) : undefined;
  const isExpanded = message?.activePath === reference.path;

  if (!message || !record) {
    return (
      <code
        className={cn(
          "border-border/50 bg-muted/50 rounded-md border px-1.5 py-0.5 font-mono text-[0.85em]",
          className,
        )}
      >
        {reference.path}
      </code>
    );
  }

  return (
    <button
      type="button"
      aria-expanded={isExpanded}
      onClick={() => message.toggle(reference.path)}
      className={cn(
        "border-border/60 bg-muted/50 hover:bg-muted inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 align-baseline font-mono text-[0.85em] transition-colors",
        isExpanded && "bg-muted",
        className,
      )}
    >
      <FileText className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{reference.path}</span>
      {record.status !== "unchanged" ? (
        <span className="flex shrink-0 gap-1">
          <span className="text-green-600">+{record.additions}</span>
          <span className="text-red-600">−{record.deletions}</span>
        </span>
      ) : null}
      <ChevronDown
        className={cn(
          "size-3 shrink-0 transition-transform",
          isExpanded && "rotate-180",
        )}
        aria-hidden
      />
    </button>
  );
}

export function LearnMessageFilePanel() {
  const message = useContext(LearnMessageFileContext);
  const source = useOptionalLearnStageSource();
  const learnMode = useOptionalLearnMode();
  const record =
    message?.activePath && source?.status === "ready"
      ? source.records.get(message.activePath)
      : undefined;

  if (!record || !learnMode) return null;

  return (
    <div className="my-3 flex min-h-0 overflow-hidden rounded-xl border">
      <LearnFileView
        record={record}
        displayMode={record.status === "unchanged" ? "source" : "diff"}
        variant="inline"
        onOpenInFiles={() =>
          learnMode.openFile(
            record.path,
            record.status === "unchanged" ? "source" : "diff",
          )
        }
      />
    </div>
  );
}
