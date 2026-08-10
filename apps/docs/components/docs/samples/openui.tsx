"use client";

import "@openuidev/react-ui/layered/styles/index.css";

import { Thread } from "@/components/assistant-ui/thread";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import {
  openuiToolDescriptions,
  openuiToolParameters,
} from "@/lib/openui-tools";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  AuiProvider,
  Suggestions,
  Tools,
  defineToolkit,
  useAui,
} from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import { ThemeProvider, useSystemThemeMode } from "@openuidev/react-ui";
import { useMemo, type ReactNode } from "react";
import { OpenUIPresent, OpenUIPrompt } from "./openui-tool-ui";
import { shouldContinueAfterOpenUIPrompt } from "./openui-utils";

function OpenUIThemeProvider({ children }: { children: ReactNode }) {
  const mode = useSystemThemeMode();

  return <ThemeProvider mode={mode}>{children}</ThemeProvider>;
}

const toolkit = defineToolkit({
  present_openui: {
    type: "frontend",
    display: "standalone",
    description: openuiToolDescriptions.present,
    parameters: openuiToolParameters,
    execute: async () => ({ displayed: true as const }),
    render: OpenUIPresent,
  },
  prompt_openui: {
    type: "human",
    display: "standalone",
    description: openuiToolDescriptions.prompt,
    parameters: openuiToolParameters,
    render: OpenUIPrompt,
  },
});

function OpenUIRuntimeProvider({ children }: { children: ReactNode }) {
  const transport = useMemo(
    () => new AssistantChatTransport({ api: "/api/openui/chat" }),
    [],
  );
  const runtime = useChatRuntime({
    transport,
    sendAutomaticallyWhen: shouldContinueAfterOpenUIPrompt,
  });
  const aui = useAui({
    tools: Tools({ toolkit }),
    suggestions: Suggestions([
      {
        title: "Launch readiness",
        label: "as a visual scorecard",
        prompt:
          "Present a product launch readiness scorecard for Product 90%, Marketing 70%, Sales 55%, and Support 80%. Include clear status badges and the three most important next actions.",
      },
      {
        title: "Plan a team offsite",
        label: "with an interactive form",
        prompt:
          "Ask me to choose an offsite destination from Lisbon, Montreal, or Kyoto, along with trip length and budget. Use an OpenUI form and wait for me to submit it.",
      },
    ]),
  });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

function OpenUIWelcome() {
  return (
    <div className="aui-thread-welcome-root mb-6 flex flex-col items-center gap-1 px-4 text-center">
      <h2 className="text-xl font-semibold">OpenUI Assistant</h2>
      <p className="text-muted-foreground max-w-lg text-sm">
        Ask for a dashboard, table, form, or other interface. OpenUI streams it
        directly into the conversation.
      </p>
    </div>
  );
}

export function OpenUISample() {
  return (
    <SampleFrame className="bg-muted/40 overflow-hidden">
      <AuiProvider extends={null} config={AuiConfig({})}>
        <OpenUIThemeProvider>
          <OpenUIRuntimeProvider>
            <Thread components={{ Welcome: OpenUIWelcome }} />
          </OpenUIRuntimeProvider>
        </OpenUIThemeProvider>
      </AuiProvider>
    </SampleFrame>
  );
}
