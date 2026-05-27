"use client";

import { ExampleNav } from "@/components/example-nav";
import { GuiThread } from "@/components/gui-thread";
import { openuiChatSystemPrompt } from "@/lib/openui-chat";
import {
  AssistantRuntimeProvider,
  Suggestions,
  useAssistantInstructions,
  useAui,
} from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";

const GuiChatInstructions = () => {
  useAssistantInstructions(openuiChatSystemPrompt);
  return null;
};

export default function GuiChatPage() {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/gui-chat" }),
  });

  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "Q4 revenue chart",
        label: "grouped bar chart",
        prompt:
          "Show a grouped bar chart of Q4 revenue: Product A [120, 150, 180] and Product B [90, 110, 140] for Oct, Nov, Dec.",
      },
      {
        title: "Contact form",
        label: "name, email, message",
        prompt:
          "Build a contact form with name, email, country select, and message fields plus Submit and Cancel buttons.",
      },
      {
        title: "React vs Vue",
        label: "tabs with callouts",
        prompt:
          "Create a tabbed comparison of React vs Vue with an info callout in each tab.",
      },
      {
        title: "AI market report",
        label: "KPIs, table, chart",
        prompt:
          "Generate an AI market report as OpenUI Lang only: CardHeader, a row of three KPI Cards, a funding Table by segment, and a grouped BarChart. No markdown lists or SectionBlock.",
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
