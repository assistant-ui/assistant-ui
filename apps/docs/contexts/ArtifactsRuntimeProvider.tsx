"use client";

import {
  AssistantRuntimeProvider,
  WebSpeechSynthesisAdapter,
  WebSpeechDictationAdapter,
  AssistantCloud,
  useAui,
  Tools,
  type Toolkit,
} from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import { DevToolsModal } from "@assistant-ui/react-devtools";
import { ModelContextClient as ModelContext } from "@assistant-ui/react";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { TerminalIcon } from "lucide-react";
import { useMemo } from "react";
import { z } from "zod";
import { anonymousSessionFetch } from "@/lib/anonymous-session-client";

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

export function ArtifactsRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const assistantCloud = useMemo(
    () =>
      new AssistantCloud({
        baseUrl: process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL!,
        anonymous: true,
      }),
    [],
  );

  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      fetch: anonymousSessionFetch,
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    adapters: {
      speech: new WebSpeechSynthesisAdapter(),
      dictation: new WebSpeechDictationAdapter(),
    },
    cloud: assistantCloud,
  });

  // Use the Tools API to register artifacts tools
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
