"use client";

import { SidebarMarkdownText } from "./sidebar-markdown";
import {
  ErrorPrimitive,
  MessagePrimitive,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import {
  CheckIcon,
  ChevronRightIcon,
  LoaderIcon,
  SearchIcon,
} from "lucide-react";
import type { FC } from "react";
import { cn } from "@/lib/utils";

export const SidebarUserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="flex justify-end py-2" data-role="user">
      <div className="max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
};

export const SidebarAssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="py-2" data-role="assistant">
      <div className="text-sm">
        <MessagePrimitive.Parts
          components={{
            Empty: SidebarThinking,
            Text: SidebarMarkdownText,
            tools: {
              Fallback: SidebarToolCall,
            },
          }}
        />
        <SidebarMessageError />
      </div>
    </MessagePrimitive.Root>
  );
};

const SidebarThinking: FC<{ status: { type: string } }> = ({ status }) => {
  if (status.type !== "running") return null;

  return (
    <div className="flex items-center gap-2 py-1 text-muted-foreground">
      <LoaderIcon className="size-3 animate-spin" />
      <span className="text-sm">Thinking...</span>
    </div>
  );
};

const SidebarToolCall: ToolCallMessagePartComponent = ({
  toolName,
  status,
}) => {
  const isRunning = status?.type === "running";
  const isComplete = status?.type === "complete";

  return (
    <div
      className={cn(
        "my-1.5 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-muted-foreground text-xs",
        isRunning && "animate-pulse",
      )}
    >
      {isRunning ? (
        <LoaderIcon className="size-3 animate-spin" />
      ) : isComplete ? (
        <CheckIcon className="size-3 text-emerald-500" />
      ) : (
        <SearchIcon className="size-3" />
      )}
      <span className="flex-1 truncate">
        {isRunning ? "Searching" : "Searched"}: {toolName}
      </span>
      <ChevronRightIcon className="size-3 opacity-50" />
    </div>
  );
};

const SidebarMessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="mt-2 rounded-md border border-destructive bg-destructive/10 p-2 text-destructive text-xs dark:bg-destructive/5 dark:text-red-200">
        <ErrorPrimitive.Message className="line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};
