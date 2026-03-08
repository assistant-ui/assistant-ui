"use client";

import { AssistantActionBar } from "./assistant-action-bar";
import { MarkdownText } from "./markdown";
import {
  ErrorPrimitive,
  MessagePrimitive,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react";
import {
  BookOpenIcon,
  CheckIcon,
  FileTextIcon,
  FolderTreeIcon,
  LoaderIcon,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Reasoning, ReasoningGroup } from "@/components/assistant-ui/reasoning";

export function UserMessage(): ReactNode {
  return (
    <MessagePrimitive.Root className="flex justify-end py-2" data-role="user">
      <div className="max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

export function AssistantMessage(): ReactNode {
  return (
    <MessagePrimitive.Root className="py-2" data-role="assistant">
      <div className="text-sm">
        <MessagePrimitive.Parts
          components={{
            Empty: Thinking,
            Text: MarkdownText,
            Reasoning,
            ReasoningGroup,
            tools: {
              Fallback: ToolCall,
            },
          }}
        />
        <MessageError />
      </div>
      <AssistantActionBar />
    </MessagePrimitive.Root>
  );
}

function Thinking({ status }: { status: { type: string } }): ReactNode {
  if (status.type !== "running") return null;

  return (
    <div className="flex items-center gap-2 py-1 text-muted-foreground">
      <LoaderIcon className="size-3 animate-spin" />
      <span className="text-sm">Thinking...</span>
    </div>
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
  status,
}: ToolCallMessagePartProps): ReactNode {
  const isRunning = status?.type === "running";
  const { icon, label, detail } = getToolDisplay(toolName, args, isRunning);
  const duration = useToolDuration(isRunning);

  return (
    <div
      className={cn(
        "my-1.5 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-muted-foreground text-xs",
        isRunning && "animate-pulse",
      )}
    >
      <ToolStatusIcon status={status} FallbackIcon={icon} />
      <span className="flex-1 truncate">
        {label} {detail}
      </span>
      {duration !== null && (
        <span className="text-muted-foreground/60">
          {formatDuration(duration)}
        </span>
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
