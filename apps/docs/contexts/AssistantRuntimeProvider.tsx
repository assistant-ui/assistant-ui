"use client";

import {
  AssistantRuntimeProvider,
  type FeedbackAdapter,
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
import {
  countToolCalls,
  getAssistantMessageTokenUsage,
  getTextLength,
} from "@/lib/assistant-metrics";

type ThreadMessagePart = { type: string; text?: string };

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

// Stateless adapter - safe to share across instances
const feedbackAdapter: FeedbackAdapter = {
  submit: () => {
    // Feedback is tracked via analytics in AssistantActionBar
    // The runtime automatically updates message.metadata.submittedFeedback
  },
};

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
    adapters: {
      feedback: feedbackAdapter,
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantAnalyticsTracker />
      <AssistantPageContext />
      {children}
    </AssistantRuntimeProvider>
  );
}
