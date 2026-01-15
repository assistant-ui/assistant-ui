"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import { Loader2 } from "lucide-react";
import {
  useWorkbenchStore,
  useWorkbenchTheme,
  useSelectedComponent,
} from "@/lib/workbench/store";
import { workbenchComponents } from "@/lib/workbench/component-registry";
import type { ConversationContext } from "@/lib/workbench/mock-config";
import { MorphContainer } from "./component-renderer";

interface MessageBubbleProps {
  sender: "user" | "assistant";
  content: string;
  isDark: boolean;
}

function MessageBubble({ sender, content, isDark }: MessageBubbleProps) {
  const isUser = sender === "user";

  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? isDark
              ? "bg-blue-600 text-white"
              : "bg-blue-500 text-white"
            : isDark
              ? "bg-neutral-800 text-neutral-100"
              : "bg-neutral-100 text-neutral-900",
        )}
      >
        {content}
      </div>
    </div>
  );
}

function ToolIndicator({
  toolName,
  isDark,
}: {
  toolName: string;
  isDark: boolean;
}) {
  return (
    <div className="flex justify-start">
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs",
          isDark
            ? "bg-neutral-800 text-neutral-400"
            : "bg-neutral-100 text-neutral-500",
        )}
      >
        <Loader2 className="size-3 animate-spin" />
        <span>Using {toolName}...</span>
      </div>
    </div>
  );
}

interface ConversationViewProps {
  children: ReactNode;
  widgetHeight: number;
  className?: string;
}

export function ConversationView({
  children,
  widgetHeight,
  className,
}: ConversationViewProps) {
  const theme = useWorkbenchTheme();
  const isDark = theme === "dark";
  const selectedComponent = useSelectedComponent();
  const mockConfig = useWorkbenchStore((s) => s.mockConfig);

  const component = workbenchComponents.find((c) => c.id === selectedComponent);
  const toolName = component?.id ?? "tool";

  const toolConfig = mockConfig.tools[toolName];
  const activeVariant = toolConfig?.variants.find(
    (v) => v.id === toolConfig.activeVariantId,
  );
  const conversation: ConversationContext | undefined =
    activeVariant?.conversation;

  const userMessage =
    conversation?.userMessage ?? getDefaultUserMessage(toolName);
  const assistantResponse =
    conversation?.assistantResponse ?? getDefaultAssistantResponse(toolName);

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden transition-colors",
        isDark ? "bg-neutral-900" : "bg-white",
        className,
      )}
    >
      <div className="scrollbar-subtle flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[770px] flex-col gap-4 p-4 pb-24">
          <MessageBubble sender="user" content={userMessage} isDark={isDark} />

          <ToolIndicator toolName={toolName} isDark={isDark} />

          <MorphContainer
            className={cn(
              "w-full overflow-hidden rounded-2xl border shadow-sm",
              isDark ? "border-neutral-700" : "border-neutral-200",
            )}
            style={{ height: widgetHeight, maxHeight: widgetHeight }}
          >
            <div className="h-full overflow-auto">{children}</div>
          </MorphContainer>

          <MessageBubble
            sender="assistant"
            content={assistantResponse}
            isDark={isDark}
          />
        </div>
      </div>
    </div>
  );
}

function getDefaultUserMessage(toolName: string): string {
  const messages: Record<string, string> = {
    "poi-map":
      "Can you show me some interesting places to visit in San Francisco?",
    welcome: "What can this app do?",
    chart: "Show me a chart of the data",
    form: "Help me fill out this form",
  };
  return messages[toolName] ?? "Can you help me with this?";
}

function getDefaultAssistantResponse(toolName: string): string {
  const responses: Record<string, string> = {
    "poi-map":
      "Here's an interactive map with some great spots to check out. Tap any location for more details!",
    welcome:
      "I'd be happy to show you around! This is an interactive widget that demonstrates the ChatGPT Apps SDK.",
  };
  return (
    responses[toolName] ??
    "Here's what I found. Let me know if you need anything else!"
  );
}
