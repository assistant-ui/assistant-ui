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
  type ComponentType,
  type ReactNode,
  useState,
  useEffect,
  useRef,
} from "react";
import { Reasoning } from "@/components/assistant-ui/reasoning";

export function UserMessage(): ReactNode {
  return (
    <MessagePrimitive.Root className="flex justify-end py-2" data-role="user">
      <div className="bg-muted max-w-[85%] rounded-(--radius-thread) px-3.5 py-2 text-sm empty:hidden">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

export function AssistantMessage({
  ToolCallComponent = ToolCall,
}: {
  ToolCallComponent?: ComponentType<ToolCallMessagePartProps>;
} = {}): ReactNode {
  return (
    <MessagePrimitive.Root className="py-2" data-role="assistant">
      <div className="text-sm">
        <MessagePrimitive.Parts>
          {({ part }) => {
            if (part.type === "text") return <MarkdownText />;
            if (part.type === "reasoning") return <Reasoning {...part} />;
            if (part.type === "tool-call")
              return part.toolUI ?? <ToolCallComponent {...part} />;
            return null;
          }}
        </MessagePrimitive.Parts>

        <AuiIf
          condition={(s) =>
            s.thread.isRunning && s.message.content.length === 0
          }
        >
          <TraceLine live label="connecting" />
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
): { label: string; detail: string } {
  switch (toolName) {
    case "listDocs": {
      const path = (args as { path?: string })?.path;
      return {
        label: isRunning ? "listing" : "listed",
        detail: path ? `/${path}` : "the docs tree",
      };
    }
    case "readDoc": {
      const slug = (args as { slugOrUrl?: string })?.slugOrUrl ?? "";
      const normalizedSlug = slug.replace(/^\/docs\/?/, "");
      return {
        label: isRunning ? "reading" : "read",
        detail: `/docs/${normalizedSlug}`,
      };
    }
    case "bash": {
      const command = (args as { command?: string })?.command ?? "";
      const preview =
        command.length > 60 ? `${command.slice(0, 57)}...` : command;
      return {
        label: isRunning ? "running" : "ran",
        detail: preview,
      };
    }
    case "readFile": {
      const filePath = (args as { path?: string })?.path ?? "";
      const shortPath = filePath.split("/").slice(-2).join("/");
      return {
        label: isRunning ? "reading" : "read",
        detail: shortPath,
      };
    }
    default:
      return {
        label: isRunning ? "running" : "done",
        detail: toolName,
      };
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

function TraceLine({
  live,
  label,
  detail,
  meta,
}: {
  live: boolean;
  label: string;
  detail?: string;
  meta?: string;
}): ReactNode {
  return (
    <div className="my-1 flex items-baseline gap-2 font-mono text-[12px] [font-variant-ligatures:none]">
      <span
        aria-hidden
        className={live ? "text-blue-500" : "text-muted-foreground/50"}
      >
        {">"}
      </span>
      <span className="text-muted-foreground min-w-0 flex-1 truncate">
        {label}
        {detail ? ` ${detail}` : null}
        {live ? (
          <span
            aria-hidden
            className="ml-1 inline-block h-[0.9em] w-[2px] animate-pulse bg-blue-500 align-middle"
          />
        ) : null}
      </span>
      {meta ? (
        <span className="text-muted-foreground/50 shrink-0">{meta}</span>
      ) : null}
    </div>
  );
}

function ToolCall({
  toolName,
  args,
  status,
}: ToolCallMessagePartProps): ReactNode {
  const isRunning = status?.type === "running";
  const { label, detail } = getToolDisplay(toolName, args, isRunning);
  const duration = useToolDuration(isRunning);

  return (
    <TraceLine
      live={isRunning}
      label={label}
      detail={detail}
      {...(duration !== null ? { meta: formatDuration(duration) } : {})}
    />
  );
}

function MessageError(): ReactNode {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="border-destructive/60 text-destructive mt-2 border-l-2 pl-3 text-[12.5px]">
        <ErrorPrimitive.Message className="line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
}
