"use client";

import { cn } from "@/lib/utils";
import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import {
  BookOpenIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  FileCodeIcon,
  FileTextIcon,
  FolderTreeIcon,
  InfoIcon,
  LayoutTemplateIcon,
  LoaderIcon,
  TerminalIcon,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

function getToolDisplay(
  toolName: string,
  args: Record<string, unknown>,
  isRunning: boolean,
): { icon: LucideIcon; label: string; detail: string } {
  switch (toolName) {
    case "listDocs": {
      const path = (args as { path?: string })?.path;
      return {
        icon: FolderTreeIcon,
        label: isRunning ? "Listing" : "Listed",
        detail: path ? `/${path}` : "documentation structure",
      };
    }
    case "readDoc": {
      const slug = (args as { slugOrUrl?: string })?.slugOrUrl ?? "";
      const normalizedSlug = slug.replace(/^\/docs\/?/, "");
      return {
        icon: FileTextIcon,
        label: isRunning ? "Reading" : "Read",
        detail: `/docs/${normalizedSlug}`,
      };
    }
    case "bash": {
      const command = (args as { command?: string })?.command ?? "";
      const preview =
        command.length > 60 ? `${command.slice(0, 57)}...` : command;
      return {
        icon: TerminalIcon,
        label: isRunning ? "Running" : "Ran",
        detail: preview,
      };
    }
    case "readFile": {
      const filePath = (args as { path?: string })?.path ?? "";
      const shortPath = filePath.split("/").slice(-2).join("/");
      return {
        icon: FileCodeIcon,
        label: isRunning ? "Reading" : "Read",
        detail: shortPath,
      };
    }
    case "inspectSourceMap": {
      const command = (args as { command?: string })?.command ?? "";
      const preview =
        command.length > 60 ? `${command.slice(0, 57)}...` : command;
      return {
        icon: TerminalIcon,
        label: isRunning ? "Running" : "Ran",
        detail: preview,
      };
    }
    case "readSourceMapFile": {
      const filePath = (args as { path?: string })?.path ?? "";
      const shortPath = filePath.split("/").slice(-2).join("/");
      return {
        icon: FileCodeIcon,
        label: isRunning ? "Reading" : "Read",
        detail: shortPath,
      };
    }
    case "getTemplateList":
      return {
        icon: LayoutTemplateIcon,
        label: isRunning ? "Searching" : "Searched",
        detail: "templates",
      };
    case "getTemplateDetails": {
      const tid = (args as { templateId?: string })?.templateId ?? "";
      return {
        icon: InfoIcon,
        label: isRunning ? "Reading" : "Read",
        detail: tid,
      };
    }
    case "openTemplatePreview": {
      const tid = (args as { templateId?: string })?.templateId ?? "";
      const vid = (args as { versionId?: string })?.versionId;
      return {
        icon: ExternalLinkIcon,
        label: isRunning ? "Opening" : "Opened",
        detail: vid ? `${tid}/${vid}` : tid,
      };
    }
    default:
      return {
        icon: BookOpenIcon,
        label: isRunning ? "Running" : "Completed",
        detail: toolName,
      };
  }
}

function ToolStatusIcon({
  status,
  FallbackIcon,
}: {
  status: { type: string } | undefined;
  FallbackIcon: LucideIcon;
}): ReactNode {
  switch (status?.type) {
    case "running":
      return <LoaderIcon className="size-3 animate-spin" />;
    case "complete":
      return <CheckIcon className="size-3 text-emerald-500" />;
    default:
      return <FallbackIcon className="size-3" />;
  }
}

function useToolDuration(isRunning: boolean): number | null {
  const startTimeRef = useRef<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (isRunning && startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    } else if (!isRunning && startTimeRef.current !== null) {
      setDuration(Date.now() - startTimeRef.current);
    }
  }, [isRunning]);

  return duration;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function ToolPayload({
  label,
  value,
}: {
  label: string;
  value: unknown;
}): ReactNode {
  return (
    <div>
      <p className="text-muted-foreground/60 mb-1 text-[10px] font-medium tracking-wide uppercase">
        {label}
      </p>
      <pre className="text-muted-foreground overflow-x-auto break-all whitespace-pre-wrap">
        {formatPayload(value)}
      </pre>
    </div>
  );
}

function formatPayload(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function XuluxToolCall({
  toolName,
  args,
  result,
  status,
}: ToolCallMessagePartProps): ReactNode {
  const isRunning = status?.type === "running";
  const { icon, label, detail } = getToolDisplay(toolName, args, isRunning);
  const duration = useToolDuration(isRunning);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-border/60 bg-muted/30 my-1.5 rounded-lg border text-xs">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className={cn(
          "text-muted-foreground flex w-full items-center gap-2 px-2.5 py-1.5",
          isRunning && "animate-pulse",
        )}
      >
        <ToolStatusIcon status={status} FallbackIcon={icon} />
        <span className="flex-1 truncate text-left">
          {label} {detail}
        </span>
        {duration !== null && (
          <span className="text-muted-foreground/60">
            {formatDuration(duration)}
          </span>
        )}
        {expanded ? (
          <ChevronUpIcon className="text-muted-foreground/50 size-3" />
        ) : (
          <ChevronDownIcon className="text-muted-foreground/50 size-3" />
        )}
      </button>

      {expanded && (
        <div className="border-border/60 space-y-2 border-t px-2.5 py-2">
          <ToolPayload label="Input" value={args} />
          {result !== undefined && (
            <ToolPayload label="Output" value={result} />
          )}
        </div>
      )}
    </div>
  );
}
