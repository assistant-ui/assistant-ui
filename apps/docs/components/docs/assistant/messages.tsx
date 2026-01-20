"use client";

import { MarkdownText } from "./markdown";
import {
  ErrorPrimitive,
  MessagePrimitive,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import {
  BookOpenIcon,
  CheckIcon,
  ChevronRightIcon,
  FileTextIcon,
  FolderTreeIcon,
  LoaderIcon,
  SearchIcon,
} from "lucide-react";
import type { FC, ReactNode } from "react";
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
    </MessagePrimitive.Root>
  );
}

const Thinking: FC<{ status: { type: string } }> = ({ status }) => {
  if (status.type !== "running") return null;

  return (
    <div className="flex items-center gap-2 py-1 text-muted-foreground">
      <LoaderIcon className="size-3 animate-spin" />
      <span className="text-sm">Thinking...</span>
    </div>
  );
};

function getToolDisplay(
  toolName: string,
  args: Record<string, unknown>,
  isRunning: boolean,
): { icon: typeof SearchIcon; label: string; detail: string } {
  switch (toolName) {
    case "searchDocs": {
      const query = (args as { query?: string })?.query ?? "";
      return {
        icon: SearchIcon,
        label: isRunning ? "Searching" : "Searched",
        detail: `"${query}"`,
      };
    }
    case "browseDocs": {
      const path = (args as { path?: string })?.path;
      return {
        icon: FolderTreeIcon,
        label: isRunning ? "Browsing" : "Browsed",
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
  FallbackIcon: typeof SearchIcon;
}): ReactNode {
  if (status?.type === "running") {
    return <LoaderIcon className="size-3 animate-spin" />;
  }
  if (status?.type === "complete") {
    return <CheckIcon className="size-3 text-emerald-500" />;
  }
  return <FallbackIcon className="size-3" />;
}

const ToolCall: ToolCallMessagePartComponent = ({ toolName, args, status }) => {
  const isRunning = status?.type === "running";
  const { icon, label, detail } = getToolDisplay(toolName, args, isRunning);

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
      <ChevronRightIcon className="size-3 opacity-50" />
    </div>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="mt-2 rounded-md border border-destructive bg-destructive/10 p-2 text-destructive text-xs dark:bg-destructive/5 dark:text-red-200">
        <ErrorPrimitive.Message className="line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};
