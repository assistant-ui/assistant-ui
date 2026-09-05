"use client";

import { useEffect, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  ModelContextClient as ModelContext,
  Tools,
  useAui,
  type Toolkit,
} from "@assistant-ui/react";
import { DevToolsModal } from "@assistant-ui/react-devtools";
import { TerminalIcon } from "lucide-react";
import { z } from "zod";
import {
  useDocsCloud,
  useDocsChatRuntime,
  useSpeechAdapters,
} from "./chat-runtime";

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
  children: ReactNode;
}) {
  const { cloud, claims } = useDocsCloud();
  const adapters = useSpeechAdapters({ dictation: true });
  const runtime = useDocsChatRuntime({
    cloud,
    adapters,
    sendAutomatically: true,
  });

  const aui = useAui({
    tools: Tools({ toolkit: artifactsToolkit }),
    modelContext: ModelContext(),
  });

  useEffect(() => {
    if (claims === 0) return;
    void runtime.threads.reload();
  }, [claims, runtime]);

  return (
    <AssistantRuntimeProvider runtime={runtime} aui={aui}>
      {children}

      <DevToolsModal />
    </AssistantRuntimeProvider>
  );
}
