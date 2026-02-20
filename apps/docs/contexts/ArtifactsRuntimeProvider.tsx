"use client";

import {
  AssistantRuntimeProvider,
  WebSpeechSynthesisAdapter,
  WebSpeechDictationAdapter,
  AssistantCloud,
  useAui,
  Tools,
  AuiProvider,
  type Toolkit,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { DevToolsModal } from "@assistant-ui/react-devtools";
import { ModelContextClient as ModelContext } from "@assistant-ui/react";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { TerminalIcon } from "lucide-react";
import { z } from "zod";

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
  const assistantCloud = new AssistantCloud({
    baseUrl: process.env["NEXT_PUBLIC_ASSISTANT_BASE_URL"]!,
    anonymous: true,
  });

  const runtime = useChatRuntime({
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
    <AuiProvider value={aui}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}

        <DevToolsModal />
      </AssistantRuntimeProvider>
    </AuiProvider>
  );
}
