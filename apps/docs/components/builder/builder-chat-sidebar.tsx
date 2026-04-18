"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ErrorPrimitive,
  AuiIf,
  useAuiState,
  Tools,
  Suggestions,
} from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { SendHorizontal, SquareIcon } from "lucide-react";
import {
  createPlaygroundChatToolkit,
  type PartialBuilderConfig,
} from "@/lib/playground-chat-toolkit";
import { useAui } from "@assistant-ui/store";
import type { BuilderConfig } from "./types";
import { applyDiff } from "@/lib/playground-url-state";

const PLAYGROUND_SUGGESTIONS = [
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
];

// --- Context (shares runtime between mobile sheet + desktop sidebar) ---

type PlaygroundChatContextValue = {
  runtime: ReturnType<typeof useChatRuntime>;
  aui: ReturnType<typeof useAui>;
};

const PlaygroundChatContext = createContext<PlaygroundChatContextValue | null>(
  null,
);

function usePlaygroundChat() {
  const ctx = useContext(PlaygroundChatContext);
  if (!ctx)
    throw new Error(
      "usePlaygroundChat must be used within PlaygroundChatProvider",
    );
  return ctx;
}

// --- Provider (plain context, no AssistantRuntimeProvider) ---

interface PlaygroundChatProviderProps {
  config: BuilderConfig;
  setConfig: (config: BuilderConfig) => void;
  children: ReactNode;
}

export function PlaygroundChatProvider({
  config,
  setConfig,
  children,
}: PlaygroundChatProviderProps) {
  const configRef = useRef(config);
  configRef.current = config;

  const onConfigUpdate = useCallback(
    (update: PartialBuilderConfig) => {
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

  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: "/api/playground-chat",
        prepareSendMessagesRequest: async (options) => ({
          body: {
            ...options.body,
            messages: options.messages,
            builderConfig: configRef.current,
          },
        }),
      }),
    [],
  );

  const runtime = useChatRuntime({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const aui = useAui(
    {
      tools: Tools({ toolkit }),
      suggestions: Suggestions(PLAYGROUND_SUGGESTIONS),
    },
    { parent: null },
  );

  const value = useMemo(() => ({ runtime, aui }), [runtime, aui]);

  return (
    <PlaygroundChatContext.Provider value={value}>
      {children}
    </PlaygroundChatContext.Provider>
  );
}

// --- Thread UI (each mount creates its own AssistantRuntimeProvider scope) ---

export function PlaygroundChatThread({
  onRunningChange,
}: {
  onRunningChange?: (isRunning: boolean) => void;
}) {
  const { runtime, aui } = usePlaygroundChat();

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      {onRunningChange && <RunningObserver onRunningChange={onRunningChange} />}
      <ThreadPrimitive.Root className="flex flex-1 flex-col overflow-hidden">
        <ThreadPrimitive.Viewport className="scrollbar-none flex flex-1 flex-col gap-3 overflow-y-auto px-3 pt-3">
          <ThreadPrimitive.Empty>
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
              <div>
                <p className="font-medium text-sm">
                  Describe how you want your chat to look
                </p>
                <p className="text-muted-foreground text-xs">
                  e.g. &quot;make it look like ChatGPT&quot; or &quot;use dark
                  mode with rounded corners&quot;
                </p>
              </div>
              <div className="flex w-full max-w-56 flex-col gap-2">
                {PLAYGROUND_SUGGESTIONS.map((s) => (
                  <ThreadPrimitive.Suggestion
                    key={s.prompt}
                    prompt={s.prompt}
                    send
                    className="rounded-lg border px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
                  >
                    <span className="font-medium">{s.title}</span>{" "}
                    <span className="text-muted-foreground">{s.label}</span>
                  </ThreadPrimitive.Suggestion>
                ))}
              </div>
            </div>
          </ThreadPrimitive.Empty>

          <ThreadPrimitive.Messages
            components={{ UserMessage, AssistantMessage }}
          />

          <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto bg-background">
            <Composer />
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}

/** Bridges runtime state to the parent; resets on unmount. */
function RunningObserver({
  onRunningChange,
}: {
  onRunningChange: (isRunning: boolean) => void;
}) {
  const isRunning = useAuiState((s) => s.thread.isRunning);
  useEffect(() => {
    onRunningChange(isRunning);
    return () => onRunningChange(false);
  }, [isRunning, onRunningChange]);
  return null;
}

function Composer() {
  return (
    <ComposerPrimitive.Root className="py-2">
      <div className="rounded-lg border border-border bg-background focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/20">
        <ComposerPrimitive.Input asChild>
          <textarea
            placeholder="Describe a change..."
            className="field-sizing-content max-h-32 w-full resize-none bg-transparent px-3 pt-2.5 pb-2 text-sm leading-5 placeholder:text-muted-foreground focus:outline-none"
            rows={1}
          />
        </ComposerPrimitive.Input>
        <div className="flex items-center justify-end px-1.5 pb-1.5">
          <AuiIf condition={(s) => !s.thread.isRunning}>
            <ComposerPrimitive.Send className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30">
              <SendHorizontal className="size-4" />
            </ComposerPrimitive.Send>
          </AuiIf>
          <AuiIf condition={(s) => s.thread.isRunning}>
            <ComposerPrimitive.Cancel className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground">
              <SquareIcon className="size-3.5 fill-current" />
            </ComposerPrimitive.Cancel>
          </AuiIf>
        </div>
      </div>
    </ComposerPrimitive.Root>
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
    <MessagePrimitive.Root className="px-3 py-2 text-sm">
      <MessagePrimitive.Content />
      <MessagePrimitive.Error>
        <ErrorPrimitive.Root className="mt-2 rounded-md border border-destructive bg-destructive/10 p-2 text-destructive text-xs dark:bg-destructive/5 dark:text-red-200">
          <ErrorPrimitive.Message className="line-clamp-2" />
        </ErrorPrimitive.Root>
      </MessagePrimitive.Error>
    </MessagePrimitive.Root>
  );
}
