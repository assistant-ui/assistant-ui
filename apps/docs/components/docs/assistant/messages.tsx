"use client";

import { AssistantActionBar } from "./assistant-action-bar";
import { MarkdownText } from "./markdown";
import {
  AuiIf,
  ErrorPrimitive,
  MessagePrimitive,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react";
import {
  BookOpenIcon,
  CheckIcon,
  FileCodeIcon,
  FileTextIcon,
  FolderTreeIcon,
  LoaderIcon,
  type LucideIcon,
  TerminalIcon,
} from "lucide-react";
import { type ReactNode, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Reasoning } from "@/components/assistant-ui/reasoning";

export function UserMessage(): ReactNode {
  return (
    <MessagePrimitive.Root className="flex justify-end py-2" data-role="user">
      <div className="max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm empty:hidden">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

export function AssistantMessage(): ReactNode {
  return (
    <MessagePrimitive.Root className="py-2" data-role="assistant">
      <div className="text-sm">
        <MessagePrimitive.Parts>
          {({ part }) => {
            if (part.type === "text") return <MarkdownText />;
            if (part.type === "reasoning") return <Reasoning {...part} />;
            if (part.type === "tool-call") return <ToolCall {...part} />;
            return null;
          }}
        </MessagePrimitive.Parts>

        <AuiIf
          condition={(s) =>
            s.thread.isRunning && s.message.content.length === 0
          }
        >
          <div className="flex items-center gap-2 py-1 text-muted-foreground">
            <LoaderIcon className="size-3 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        </AuiIf>
        <MessageError />
      </div>
      <AssistantActionBar />
    </MessagePrimitive.Root>
  );
}

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

function ToolCall({
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
    <div className="my-1.5 rounded-lg border border-border/60 bg-muted/30 text-xs">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 px-2.5 py-1.5 text-muted-foreground",
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
        <span className="text-muted-foreground/40">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="space-y-2 border-border/60 border-t px-2.5 py-2">
          <div>
            <p className="mb-1 font-medium text-[10px] text-muted-foreground/60 uppercase tracking-wide">
              Input
            </p>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>
          {result !== undefined && (
            <div>
              <p className="mb-1 font-medium text-[10px] text-muted-foreground/60 uppercase tracking-wide">
                Output
              </p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground">
                {typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MessageError(): ReactNode {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="mt-2 rounded-md border border-destructive bg-destructive/10 p-2 text-destructive text-xs dark:bg-destructive/5 dark:text-red-200">
        <ErrorPrimitive.Message className="line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
}
