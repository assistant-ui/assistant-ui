"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  CloudFileAttachmentAdapter,
  Suggestions,
  Tools,
  readAnonymousRefreshToken,
  unstable_Interactables,
  useAui,
} from "@assistant-ui/react";
import { DevToolsModal } from "@assistant-ui/react-devtools";
import { feedbackAdapter } from "@/lib/feedback-adapter";
import docsToolkit from "@/lib/docs-toolkit";
import { refreshDemoUsage } from "@/lib/demo-usage-client";
import usageToolkit from "@/lib/usage-toolkit";
import { MemoryInstructions } from "@/components/shared/memory";
import {
  followUpSuggestionAdapter,
  useDocsCloud,
  useDocsChatRuntime,
  useSpeechAdapters,
} from "./chat-runtime";

const claimedAnonymousTokens = new Set<string>();

const DOCS_SUGGESTIONS = [
  {
    title: "What's the weather",
    label: "in San Francisco?",
    prompt: "What's the weather in San Francisco?",
  },
  {
    title: "Explain React hooks",
    label: "like useState and useEffect",
    prompt: "Explain React hooks like useState and useEffect",
  },
  {
    title: "Show a live dashboard",
    label: "with the present tool",
    prompt:
      "Use the present tool to show a compact sales dashboard: a Card with two Facts in a Row and a bar Chart of monthly sales.",
  },
];

export function DocsRuntimeProvider({
  children,
  devtools = true,
  followUps = false,
  countConversations = false,
}: {
  children: ReactNode;
  devtools?: boolean;
  followUps?: boolean;
  /** Only the landing page demo draws on the daily conversation budget. */
  countConversations?: boolean;
}) {
  const { cloud, accountOwned } = useDocsCloud();
  const speech = useSpeechAdapters({ dictation: true });

  const adapters = useMemo(
    () => ({
      ...speech,
      feedback: feedbackAdapter,
      attachments: new CloudFileAttachmentAdapter(cloud),
      ...(followUps ? { suggestion: followUpSuggestionAdapter } : {}),
    }),
    [cloud, followUps, speech],
  );

  const runtime = useDocsChatRuntime({
    cloud,
    adapters,
    sendAutomatically: true,
    searchDocs: followUps,
    countConversations,
  });

  const toolkit = useMemo(
    () =>
      countConversations ? { ...docsToolkit, ...usageToolkit } : docsToolkit,
    [countConversations],
  );

  const aui = useAui({
    tools: Tools({ toolkit }),
    unstable_interactables: unstable_Interactables(),
    suggestions: Suggestions(DOCS_SUGGESTIONS),
  });

  useEffect(() => {
    if (!accountOwned) return;
    const refreshToken = readAnonymousRefreshToken(
      process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!,
    );
    if (!refreshToken || claimedAnonymousTokens.has(refreshToken)) return;
    claimedAnonymousTokens.add(refreshToken);

    void fetch("/api/demo/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { moved?: unknown };
        if (typeof payload.moved !== "number" || payload.moved <= 0) return;
        refreshDemoUsage();
        await aui.threads().reload();
      })
      .catch(() => {});
  }, [accountOwned, aui]);

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      <MemoryInstructions />
      {children}

      {devtools ? <DevToolsModal /> : null}
    </AssistantRuntimeProvider>
  );
}
