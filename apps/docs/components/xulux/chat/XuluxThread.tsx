"use client";

import { ModelSelector } from "@/components/assistant-ui/model-selector";
import { Reasoning } from "@/components/assistant-ui/reasoning";
import { AssistantActionBar } from "@/components/docs/assistant/assistant-action-bar";
import { useAssistantPanel } from "@/components/docs/assistant/context";
import { useCurrentPage } from "@/components/docs/contexts/current-page";
import { ContextDisplay } from "@assistant-ui/ui/components/assistant-ui/context-display";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import { getComposerMessageMetrics } from "@/lib/assistant-analytics-helpers";
import { cn } from "@/lib/utils";
import {
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  type ToolCallMessagePartProps,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { useThreadTokenUsage } from "@assistant-ui/react-ai-sdk";
import {
  ArrowUpIcon,
  BookOpenIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FileCodeIcon,
  FileTextIcon,
  FolderTreeIcon,
  LoaderIcon,
  PlusIcon,
  SquareIcon,
  TerminalIcon,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { MarkdownText } from "@/components/docs/assistant/markdown";
import { XuluxPoweredBy } from "../XuluxPoweredBy";

const XULUX_CONTEXT_WINDOW = 400_000;
const XULUX_DEFAULT_MODEL_ID = "gpt-5.4-mini";

const XULUX_MODELS = [
  {
    id: "gpt-5.4-mini",
    name: "GPT-5.4 Mini",
    modelName: "gpt-5.4-mini",
  },
  {
    id: "gpt-5.4-low",
    name: "GPT-5.4 Low",
    description: "Low reasoning",
    modelName: "gpt-5.4",
    reasoningEffort: "low",
  },
] as const;

type XuluxModelId = (typeof XULUX_MODELS)[number]["id"];

function PendingMessageHandler() {
  const { pendingMessage, clearPendingMessage } = useAssistantPanel();
  const aui = useAui();
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const threadId = useAuiState((s) => s.threadListItem.id);
  const currentPage = useCurrentPage();
  const pathname = currentPage?.pathname;
  const processedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pendingMessage || processedRef.current === pendingMessage) return;
    if (isRunning) return;

    processedRef.current = pendingMessage;
    clearPendingMessage();
    analytics.assistant.messageSent({
      threadId,
      source: "ask_ai",
      message_length: pendingMessage.length,
      attachments_count: 0,
      ...(pathname ? { pathname } : {}),
      ...(() => {
        try {
          const modelName = aui.thread().getModelContext()?.config?.modelName;
          return modelName ? { model_name: modelName } : {};
        } catch {
          return {};
        }
      })(),
    });
    aui.thread().append(pendingMessage);
  }, [pendingMessage, clearPendingMessage, aui, isRunning, threadId, pathname]);

  return null;
}

export function XuluxThread({
  onNewThread,
}: {
  onNewThread: () => void;
}): ReactNode {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col bg-background">
      <PendingMessageHandler />
      <ThreadPrimitive.Viewport className="scrollbar-none flex flex-1 flex-col overflow-y-auto px-3 pt-3">
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <XuluxWelcome />
        </AuiIf>

        <div className="px-1.5" data-slot="thread-messages">
          <ThreadPrimitive.Messages>
            {({ message }) => {
              if (message.role === "user") return <XuluxUserMessage />;
              if (message.role === "assistant")
                return <XuluxAssistantMessage />;
              return null;
            }}
          </ThreadPrimitive.Messages>
        </div>

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto flex flex-col overflow-visible rounded-t-xl bg-background">
          <XuluxComposer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
      <XuluxFooter onNewThread={onNewThread} />
    </ThreadPrimitive.Root>
  );
}

function XuluxUserMessage(): ReactNode {
  return (
    <MessagePrimitive.Root className="flex justify-end py-2" data-role="user">
      <div className="max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm empty:hidden">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function XuluxAssistantMessage(): ReactNode {
  return (
    <MessagePrimitive.Root className="py-2" data-role="assistant">
      <div className="text-sm">
        <MessagePrimitive.Parts>
          {({ part }) => {
            if (part.type === "text") return <MarkdownText />;
            if (part.type === "reasoning") return <Reasoning {...part} />;
            if (part.type === "tool-call") return <XuluxToolCall {...part} />;
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

function XuluxComposer(): ReactNode {
  const aui = useAui();
  const threadId = useAuiState((s) => s.threadListItem.id);
  const currentPage = useCurrentPage();
  const pathname = currentPage?.pathname;
  const [modelValue, setModelValue] = useState<XuluxModelId>(
    XULUX_DEFAULT_MODEL_ID,
  );
  const selectedModel =
    XULUX_MODELS.find((model) => model.id === modelValue) ?? XULUX_MODELS[0];
  const modelOptions = useMemo(
    () =>
      XULUX_MODELS.map((model) => ({
        id: model.id,
        name: model.name,
        ...("description" in model
          ? { description: model.description }
          : undefined),
        icon: (
          <Image
            src="/icons/openai.svg"
            alt={model.name}
            width={16}
            height={16}
            className="size-4"
          />
        ),
      })),
    [],
  );

  useEffect(() => {
    const config = {
      config: {
        modelName: selectedModel.modelName,
        ...("reasoningEffort" in selectedModel
          ? { reasoningEffort: selectedModel.reasoningEffort }
          : undefined),
      },
    };

    return aui.modelContext().register({
      getModelContext: () => config,
    });
  }, [aui, selectedModel]);

  return (
    <ComposerPrimitive.Root
      onSubmit={() => {
        const metrics = getComposerMessageMetrics(aui.composer().getState());
        if (!metrics) return;

        analytics.assistant.messageSent({
          threadId,
          source: "composer",
          message_length: metrics.messageLength,
          attachments_count: metrics.attachmentsCount,
          ...(pathname ? { pathname } : {}),
          model_name: selectedModel.modelName,
        });
      }}
      className="pb-0.5"
    >
      <div className="rounded-xl border border-border bg-background focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/20">
        <ComposerPrimitive.Input asChild>
          <textarea
            placeholder="Ask Xulux to build or refine the UI..."
            className="field-sizing-content max-h-32 w-full resize-none bg-transparent px-3 pt-2.5 pb-2 text-sm leading-5 placeholder:text-muted-foreground focus:outline-none"
            rows={1}
          />
        </ComposerPrimitive.Input>
        <div className="flex items-center justify-between px-1.5 pb-1.5">
          <ModelSelector.Root
            models={modelOptions}
            value={modelValue}
            onValueChange={(value) => {
              if (isXuluxModelId(value)) setModelValue(value);
            }}
          >
            <ModelSelector.Trigger variant="ghost" size="sm" />
            <ModelSelector.Content />
          </ModelSelector.Root>
          <XuluxComposerAction />
        </div>
      </div>
    </ComposerPrimitive.Root>
  );
}

function XuluxComposerAction(): ReactNode {
  return (
    <>
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <Button size="icon" className="size-7 rounded-lg">
            <ArrowUpIcon className="size-4" />
          </Button>
        </ComposerPrimitive.Send>
      </AuiIf>

      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-7 rounded-lg"
          >
            <SquareIcon className="size-3 fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </>
  );
}

function XuluxFooter({ onNewThread }: { onNewThread: () => void }): ReactNode {
  const aui = useAui();
  const threadId = useAuiState((s) => s.threadListItem.id);
  const messages = useAuiState((s) => s.thread.messages);
  const currentPage = useCurrentPage();
  const pathname = currentPage?.pathname;
  const lastUsage = useThreadTokenUsage();
  const contextTokens = lastUsage?.totalTokens ?? 0;
  const usagePercent = Math.min(
    (contextTokens / XULUX_CONTEXT_WINDOW) * 100,
    100,
  );

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-1.5">
      <button
        type="button"
        onClick={() => {
          const modelName = aui.thread().getModelContext()?.config?.modelName;
          analytics.assistant.newThreadClicked({
            threadId,
            previous_message_count: messages.length,
            context_total_tokens: contextTokens,
            context_usage_percent: usagePercent,
            ...(pathname ? { pathname } : {}),
            ...(modelName ? { model_name: modelName } : {}),
          });
          onNewThread();
        }}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
      >
        <PlusIcon className="size-3.5" />
        <span>New thread</span>
      </button>

      <XuluxPoweredBy className="min-w-0 truncate px-1" />

      <div className="flex justify-end">
        <ContextDisplay.Bar
          modelContextWindow={XULUX_CONTEXT_WINDOW}
          usage={lastUsage}
        />
      </div>
    </div>
  );
}

function XuluxWelcome(): ReactNode {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <p className="text-muted-foreground text-sm">
        Pick a template preview or describe what to build.
      </p>
    </div>
  );
}

function isXuluxModelId(value: string): value is XuluxModelId {
  return XULUX_MODELS.some((model) => model.id === value);
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

function XuluxToolCall({
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
        onClick={() => setExpanded((value) => !value)}
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
        {expanded ? (
          <ChevronUpIcon className="size-3 text-muted-foreground/50" />
        ) : (
          <ChevronDownIcon className="size-3 text-muted-foreground/50" />
        )}
      </button>

      {expanded && (
        <div className="space-y-2 border-border/60 border-t px-2.5 py-2">
          <ToolPayload label="Input" value={args} />
          {result !== undefined && (
            <ToolPayload label="Output" value={result} />
          )}
        </div>
      )}
    </div>
  );
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
      <p className="mb-1 font-medium text-[10px] text-muted-foreground/60 uppercase tracking-wide">
        {label}
      </p>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground">
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

function MessageError(): ReactNode {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="mt-2 rounded-md border border-destructive bg-destructive/10 p-2 text-destructive text-xs dark:bg-destructive/5 dark:text-red-200">
        <ErrorPrimitive.Message className="line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
}
