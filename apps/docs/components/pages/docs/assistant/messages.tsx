"use client";

import { AssistantActionBar } from "./assistant-action-bar";
import { MarkdownText } from "./markdown";
import {
  ErrorPrimitive,
  MessagePrimitive,
  type ToolCallMessagePartProps,
} from "@assistant-ui/react";
import { type ComponentType, type ReactNode } from "react";
import { Reasoning } from "@/components/assistant-ui/reasoning";
import {
  TraceLine,
  formatDuration,
  useToolDuration,
} from "@/components/shared/trace-line";

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
            if (part.type === "text") {
              if (part.text === "" && part.status?.type === "running")
                return <TraceLine live label="thinking" />;
              return <MarkdownText />;
            }
            if (part.type === "reasoning") return <Reasoning {...part} />;
            if (part.type === "tool-call")
              return part.toolUI ?? <ToolCallComponent {...part} />;
            return null;
          }}
        </MessagePrimitive.Parts>
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
