"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useAui,
  useAuiState,
  Tools,
  Suggestions,
} from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { SendHorizontal, X } from "lucide-react";
import {
  createPlaygroundChatToolkit,
  type PartialBuilderConfig,
} from "@/lib/playground-chat-toolkit";
import type { BuilderConfig } from "./types";
import { applyDiff } from "@/lib/playground-url-state";

interface BuilderChatSidebarProps {
  config: BuilderConfig;
  setConfig: (config: BuilderConfig) => void;
  onClose: () => void;
  showHeader?: boolean;
  onRunningChange?: (isRunning: boolean) => void;
}

export function BuilderChatSidebar({
  config,
  setConfig,
  onClose,
  showHeader = true,
  onRunningChange,
}: BuilderChatSidebarProps) {
  const configRef = useRef(config);
  configRef.current = config;

  const onConfigUpdate = useCallback(
    (update: PartialBuilderConfig) => {
      // Handle customCSS: append to existing rather than replace
      const { customCSS, ...rest } = update;
      const merged = applyDiff(
        rest as Record<string, unknown>,
        configRef.current,
      );
      if (customCSS !== undefined) {
        merged.customCSS = customCSS
          ? [configRef.current.customCSS, customCSS].filter(Boolean).join("\n")
          : "";
      }
      setConfig(merged);
    },
    [setConfig],
  );

  const toolkit = useMemo(
    () => createPlaygroundChatToolkit(onConfigUpdate),
    [onConfigUpdate],
  );

  return (
    <div className="flex h-full shrink-0 flex-col rounded-md border bg-background md:w-80">
      {showHeader && (
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="font-medium text-sm">AI Assistant</span>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close chat"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
      <ChatContent
        toolkit={toolkit}
        configRef={configRef}
        onRunningChange={onRunningChange}
      />
    </div>
  );
}

function RunningObserver({
  onRunningChange,
}: {
  onRunningChange: ((isRunning: boolean) => void) | undefined;
}) {
  const isRunning = useAuiState((s) => s.thread.isRunning);
  useEffect(() => {
    onRunningChange?.(isRunning);
  }, [isRunning, onRunningChange]);
  return null;
}

function ChatContent({
  toolkit,
  configRef,
  onRunningChange,
}: {
  toolkit: ReturnType<typeof createPlaygroundChatToolkit>;
  configRef: React.RefObject<BuilderConfig>;
  onRunningChange: ((isRunning: boolean) => void) | undefined;
}) {
  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: "/api/playground-chat",
        prepareSendMessagesRequest: async (options) => ({
          body: {
            ...options.body,
            id: options.id,
            messages: options.messages,
            trigger: options.trigger,
            messageId: options.messageId,
            metadata: options.requestMetadata,
            builderConfig: configRef.current,
          },
        }),
      }),
    [configRef],
  );

  const runtime = useChatRuntime({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const aui = useAui({
    tools: Tools({ toolkit }),
    suggestions: Suggestions([
      {
        title: "Make it look like",
        label: "ChatGPT",
        prompt: "Make it look like ChatGPT",
      },
      {
        title: "Switch to",
        label: "dark mode",
        prompt: "Switch to dark mode with blue accents",
      },
      {
        title: "Enable all",
        label: "features",
        prompt: "Enable all features like attachments, avatars, and feedback",
      },
    ]),
  });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      <RunningObserver onRunningChange={onRunningChange} />
      <ThreadPrimitive.Root className="flex flex-1 flex-col overflow-hidden">
        <ThreadPrimitive.Viewport className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 pt-3">
          <ThreadPrimitive.Empty>
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="font-medium text-sm">
                Describe how you want your chat to look
              </p>
              <p className="text-muted-foreground text-xs">
                e.g. &quot;make it look like ChatGPT&quot; or &quot;use dark
                mode with rounded corners&quot;
              </p>
            </div>
          </ThreadPrimitive.Empty>

          <ThreadPrimitive.Messages
            components={{ UserMessage, AssistantMessage }}
          />
        </ThreadPrimitive.Viewport>

        <div className="border-t p-3">
          <ComposerPrimitive.Root className="flex items-end gap-2 rounded-lg border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
            <ComposerPrimitive.Input
              placeholder="Describe a change..."
              className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <ComposerPrimitive.Send className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30">
              <SendHorizontal className="size-4" />
            </ComposerPrimitive.Send>
          </ComposerPrimitive.Root>
        </div>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <div className="max-w-[85%] rounded-lg bg-foreground/5 px-3 py-2 text-sm">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-start">
      <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
}
