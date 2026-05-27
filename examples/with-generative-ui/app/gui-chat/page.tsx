"use client";

import { ExampleNav } from "@/components/example-nav";
import { GuiThread } from "@/components/gui-thread";
import {
  AssistantRuntimeProvider,
  Suggestions,
  useAssistantInstructions,
  useAui,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { renderGuiChatInstructions } from "@/lib/render-gui-tool";

const GuiChatInstructions = () => {
  useAssistantInstructions(renderGuiChatInstructions);
  return null;
};

export default function GuiChatPage() {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "Welcome card",
        label: "with a Get started button",
        prompt:
          "Show me a welcome card with a Get started button using render_gui.",
      },
      {
        title: "Stats dashboard",
        label: "revenue and users",
        prompt:
          "Use render_gui to show a stats card with Revenue $124k and Active Users 8.2k.",
      },
    ]),
  });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      <GuiChatInstructions />
      <div className="flex h-full flex-col">
        <ExampleNav />
        <main className="min-h-0 flex-1">
          <GuiThread />
        </main>
      </div>
    </AssistantRuntimeProvider>
  );
}
