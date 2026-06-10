"use client";

import { ExampleNav } from "@/components/example-nav";
import { AssistantMessageGui } from "@/components/assistant-message-gui";
import {
  Thread,
  type ThreadComponents,
} from "@/components/assistant-ui/thread";
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

const GuiWelcome = () => {
  return (
    <div className="aui-thread-welcome-root mb-6 flex flex-col items-center gap-1 px-4 text-center">
      <h1 className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-2xl font-semibold duration-200">
        Compose UI from a spec
      </h1>
      <p className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-muted-foreground text-xl delay-75 duration-200">
        Ask the agent to call render_gui with Card, Button, and Stack.
      </p>
    </div>
  );
};

const THREAD_COMPONENTS: ThreadComponents = {
  AssistantMessage: AssistantMessageGui,
  Welcome: GuiWelcome,
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
          <Thread components={THREAD_COMPONENTS} />
        </main>
      </div>
    </AssistantRuntimeProvider>
  );
}
