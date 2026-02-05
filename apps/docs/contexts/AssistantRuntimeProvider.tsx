"use client";

import {
  AssistantRuntimeProvider,
  useAssistantInstructions,
  useAui,
  useAuiEvent,
} from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useEffect, useRef, type ReactNode } from "react";
import { useCurrentPage } from "@/components/docs/contexts/current-page";
import { analytics } from "@/lib/analytics";

type ThreadMessagePart = { type: string; text?: string };

function getTextLength(parts: readonly ThreadMessagePart[]): number {
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("").length;
}

function countToolCalls(parts: readonly { type: string }[]): number {
  return parts.filter((p) => p.type === "tool-call").length;
}

function getLastUserMessage(
  messages: readonly {
    role?: string;
    content?: readonly ThreadMessagePart[];
    attachments?: readonly unknown[];
  }[],
) {
  for (let idx = messages.length - 1; idx >= 0; idx -= 1) {
    const message = messages[idx];
    if (message?.role === "user") return message;
  }
  return undefined;
}

function getLastAssistantMessage(
  messages: readonly {
    role?: string;
    content?: readonly ThreadMessagePart[];
    status?: { type: string; reason?: string };
    metadata?: unknown;
  }[],
) {
  for (let idx = messages.length - 1; idx >= 0; idx -= 1) {
    const message = messages[idx];
    if (message?.role === "assistant") return message;
  }
  return undefined;
}

function getAssistantMessageTokenUsage(
  message:
    | {
        role?: string;
        metadata?: unknown;
      }
    | undefined,
): {
  totalTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
} {
  if (!message || message.role !== "assistant") return {};

  const metadata = message.metadata as Record<string, unknown> | undefined;
  const custom = metadata?.["custom"] as Record<string, unknown> | undefined;
  const usage = custom?.["usage"] as Record<string, number> | undefined;

  if (usage) {
    const totalTokens =
      usage["totalTokens"] ??
      (usage["inputTokens"] ?? 0) + (usage["outputTokens"] ?? 0);
    const inputTokens = usage["inputTokens"];
    const outputTokens = usage["outputTokens"];

    if (
      totalTokens > 0 ||
      inputTokens !== undefined ||
      outputTokens !== undefined
    ) {
      return {
        ...(totalTokens > 0 ? { totalTokens } : {}),
        ...(inputTokens !== undefined ? { inputTokens } : {}),
        ...(outputTokens !== undefined ? { outputTokens } : {}),
      };
    }
  }

  const steps = (metadata?.["steps"] ?? []) as Array<{
    usage?: { promptTokens: number; completionTokens: number };
  }>;

  let promptTokens = 0;
  let completionTokens = 0;
  for (const step of steps) {
    if (!step.usage) continue;
    promptTokens += step.usage.promptTokens;
    completionTokens += step.usage.completionTokens;
  }

  const totalTokens = promptTokens + completionTokens;
  if (totalTokens <= 0) return {};

  return {
    totalTokens,
    inputTokens: promptTokens,
    outputTokens: completionTokens,
  };
}

function AssistantPageContext() {
  const currentPage = useCurrentPage();
  const pathname = currentPage?.pathname;

  useAssistantInstructions({
    instruction: pathname
      ? `The user is currently viewing: ${pathname}`
      : "The user is on the docs site.",
    disabled: !pathname,
  });

  return null;
}

function AssistantAnalyticsTracker() {
  const aui = useAui();
  const currentPage = useCurrentPage();
  const pathname = currentPage?.pathname;

  const pathnameRef = useRef<string | undefined>(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useAuiEvent("composer.send", (event) => {
    const messages = (() => {
      try {
        return aui.thread().getState().messages;
      } catch {
        return [];
      }
    })();

    const lastUser = getLastUserMessage(messages);
    const messageLength = getTextLength(lastUser?.content ?? []);
    const attachmentsCount = lastUser?.attachments?.length ?? 0;

    let modelName: string | undefined;
    try {
      modelName = aui.thread().getModelContext()?.config?.modelName;
    } catch {
      // ignore
    }

    analytics.assistant.messageSent({
      threadId: event.threadId,
      ...(event.messageId ? { messageId: event.messageId } : {}),
      source: "composer",
      message_length: messageLength,
      attachments_count: attachmentsCount,
      ...(pathnameRef.current ? { pathname: pathnameRef.current } : {}),
      ...(modelName ? { model_name: modelName } : {}),
    });
  });

  const runStartedAtRef = useRef(new Map<string, number>());

  useAuiEvent("thread.runStart", (event) => {
    runStartedAtRef.current.set(event.threadId, Date.now());
  });

  useAuiEvent("thread.runEnd", (event) => {
    const startedAt = runStartedAtRef.current.get(event.threadId);
    runStartedAtRef.current.delete(event.threadId);
    const latencyMs =
      startedAt === undefined ? undefined : Date.now() - startedAt;

    const messages = (() => {
      try {
        return aui.thread().getState().messages;
      } catch {
        return [];
      }
    })();

    const lastAssistant = getLastAssistantMessage(messages);
    const responseLength = getTextLength(lastAssistant?.content ?? []);
    const toolCallsCount = countToolCalls(lastAssistant?.content ?? []);
    const status = lastAssistant?.status;
    const tokenUsage = getAssistantMessageTokenUsage(lastAssistant);

    let modelName: string | undefined;
    try {
      modelName = aui.thread().getModelContext()?.config?.modelName;
    } catch {
      // ignore
    }

    const payload: Parameters<typeof analytics.assistant.responseCompleted>[0] =
      {
        threadId: event.threadId,
        response_length: responseLength,
        tool_calls_count: toolCallsCount,
        ...(latencyMs === undefined ? {} : { latency_ms: latencyMs }),
        ...(status?.reason ? { status_reason: status.reason } : {}),
        ...(tokenUsage.totalTokens === undefined
          ? {}
          : { response_total_tokens: tokenUsage.totalTokens }),
        ...(tokenUsage.inputTokens === undefined
          ? {}
          : { response_input_tokens: tokenUsage.inputTokens }),
        ...(tokenUsage.outputTokens === undefined
          ? {}
          : { response_output_tokens: tokenUsage.outputTokens }),
        ...(pathnameRef.current ? { pathname: pathnameRef.current } : {}),
        ...(modelName ? { model_name: modelName } : {}),
      };

    if (status?.type === "incomplete") {
      analytics.assistant.responseFailed(payload);
      return;
    }

    analytics.assistant.responseCompleted(payload);
  });

  return null;
}

export function DocsAssistantRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/doc/chat",
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantAnalyticsTracker />
      <AssistantPageContext />
      {children}
    </AssistantRuntimeProvider>
  );
}
