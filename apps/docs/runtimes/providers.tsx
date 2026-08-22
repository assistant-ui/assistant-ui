"use client";

import { useMemo, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  CloudFileAttachmentAdapter,
  ModelContextClient as ModelContext,
  SimpleImageAttachmentAdapter,
  Suggestions,
  Tools,
  unstable_Interactables,
  useAui,
  type Toolkit,
} from "@assistant-ui/react";
import { DevToolsModal } from "@assistant-ui/react-devtools";
import { TerminalIcon } from "lucide-react";
import { z } from "zod";
import { feedbackAdapter } from "@/lib/feedback-adapter";
import docsToolkit from "@/lib/docs-toolkit";
import {
  useAnonymousCloud,
  useDocsChatRuntime,
  useSpeechAdapters,
} from "./chat-runtime";
import {
  AssistantAnalyticsTracker,
  AssistantPageContext,
} from "./assistant-analytics";

const artifactsToolkit: Toolkit = {
  render_html: {
    description:
      "Whenever the user asks for HTML code, call this function. The user will see the HTML code rendered in their browser.",
    parameters: z.object({
      code: z.string(),
    }),
    execute: async () => {
      return {};
    },
    render: () => {
      return (
        <div className="my-2 inline-flex items-center gap-2 rounded-full border bg-black px-4 py-2 text-white">
          <TerminalIcon className="size-4" />
          render_html({"{"} code: &quot;...&quot; {"}"})
        </div>
      );
    },
  },
};

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

export function DocsRuntimeProvider({ children }: { children: ReactNode }) {
  const cloud = useAnonymousCloud();
  const speech = useSpeechAdapters({ dictation: true });

  const adapters = useMemo(
    () => ({
      ...speech,
      feedback: feedbackAdapter,
      attachments: new CloudFileAttachmentAdapter(cloud),
    }),
    [cloud, speech],
  );

  const runtime = useDocsChatRuntime({ cloud, adapters });

  const aui = useAui({
    tools: Tools({ toolkit: docsToolkit }),
    unstable_interactables: unstable_Interactables(),
    suggestions: Suggestions(DOCS_SUGGESTIONS),
  });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      {children}

      <DevToolsModal />
    </AssistantRuntimeProvider>
  );
}

export function ArtifactsRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const cloud = useAnonymousCloud();
  const adapters = useSpeechAdapters({ dictation: true });
  const runtime = useDocsChatRuntime({ cloud, adapters });

  const aui = useAui({
    tools: Tools({ toolkit: artifactsToolkit }),
    modelContext: ModelContext(),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} aui={aui}>
      {children}

      <DevToolsModal />
    </AssistantRuntimeProvider>
  );
}

export function DocsAssistantRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const adapters = useMemo(
    () => ({
      feedback: feedbackAdapter,
      attachments: new SimpleImageAttachmentAdapter(),
    }),
    [],
  );

  const runtime = useDocsChatRuntime({ api: "/api/doc/chat", adapters });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantAnalyticsTracker />
      <AssistantPageContext />
      {children}
    </AssistantRuntimeProvider>
  );
}

export function PlaygroundRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const adapters = useSpeechAdapters();
  const runtime = useDocsChatRuntime({ adapters });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
