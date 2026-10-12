"use client";

import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { ThreadListSidebar } from "@/components/assistant-ui/elements/threadlist-sidebar.aui";
import { ExampleNav } from "@/components/example-nav";
import { ToolCallInspector } from "@/components/tool-call-inspector";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { DEFAULT_MODEL, isModelId, MODELS, type ModelId } from "@/lib/models";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import {
  createLocalStorageAdapter,
  createSimpleTitleAdapter,
  useRemoteThreadListRuntime,
  type AsyncStorageLike,
} from "@assistant-ui/core/react";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
  Tools,
  useAssistantInstructions,
} from "@assistant-ui/react";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useWidgetInstructions } from "generative-frame/assistant-ui";
import { useState, useSyncExternalStore } from "react";
import { widgets } from "./generative-ui-toolkit";

const MODEL_KEY = "with-generative-ui:model";
const MODEL_EVENT = "with-generative-ui:model";

let sessionModel: ModelId | undefined;

const readModel = (): ModelId => {
  if (sessionModel) return sessionModel;
  try {
    const stored = localStorage.getItem(MODEL_KEY);
    return isModelId(stored) ? stored : DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
};

const subscribeToModel = (onChange: () => void) => {
  window.addEventListener(MODEL_EVENT, onChange);
  return () => window.removeEventListener(MODEL_EVENT, onChange);
};

const chooseModel = (model: ModelId) => {
  sessionModel = model;
  try {
    localStorage.setItem(MODEL_KEY, model);
  } catch {
    // Storage can be unavailable, as in a private window; the choice then lasts for this page view.
  }
  window.dispatchEvent(new Event(MODEL_EVENT));
};

const browserStorage: AsyncStorageLike = {
  getItem: async (key) => localStorage.getItem(key),
  setItem: async (key, value) => localStorage.setItem(key, value),
  removeItem: async (key) => localStorage.removeItem(key),
};

const transport = new AssistantChatTransport({
  api: "/api/generative-ui",
  body: () => ({ model: readModel() }),
});

const config = AuiConfig({
  tools: Tools({ toolkit: widgets.toolkit }),
  suggestions: Suggestions([
    {
      title: "Compare laptops",
      label: "a spec with tables and tabs",
      prompt:
        "I'm choosing a laptop for a computer science degree with a budget of about $1,500. Compare the MacBook Air, the Dell XPS 14, and the ThinkPad X1 Carbon on performance, battery life, weight, ports, and Linux support, and tell me which you would pick.",
    },
    {
      title: "Plan a road trip",
      label: "photos, a map, and each day's drive",
      prompt:
        "Plan a four-day road trip from San Francisco to Los Angeles along the coast. Tell me where to stay each night, how long each day's drive is, and one thing worth stopping for each day.",
    },
    {
      title: "Fix a flat tire",
      label: "a step-by-step guide",
      prompt:
        "My bike's rear tire is flat. Walk me through taking the rear wheel off, patching the tube, and putting the wheel back on. I have tire levers, a patch kit, and a floor pump.",
    },
    {
      title: "Split a bill",
      label: "a calculator widget",
      prompt:
        "Four of us had dinner and the bill came to $186.40 before tip. One person only had a $14 salad and wants to pay for just that plus tip. Help us split the rest evenly, with a tip we can adjust between 15% and 25%.",
    },
    {
      title: "Plan a brisket",
      label: "amounts that follow the guest count",
      prompt:
        "I'm smoking a brisket for a backyard party. Help me work out how much raw brisket to buy, how much rub to make, and when to start cooking so it's ready at 6 pm. Somewhere between 8 and 20 people are coming, so I want to change the guest count and see everything update.",
    },
    {
      title: "Play Monty Hall",
      label: "an explanation and a game",
      prompt:
        "I don't get the Monty Hall problem. Explain why switching doors is better, and let me play some rounds myself so I can see how staying and switching compare.",
    },
    {
      title: "Pick a flight",
      label: "prices read from a tool result",
      prompt:
        "Find nonstop flights from SFO to LAX on 2026-10-23 and show them so I can compare and pick one.",
    },
    {
      title: "Ask a quick question",
      label: "answered in Markdown",
      prompt: "What's the difference between a latte and a flat white?",
    },
  ]),
});

function WidgetInstructions() {
  useWidgetInstructions(widgets.tools);
  useAssistantInstructions(
    "When an answer is about places, dishes, or products, call `search_images` for them before `render_spec`, so the answer can show photos.",
  );
  return null;
}

function ModelPicker() {
  const model = useSyncExternalStore(
    subscribeToModel,
    readModel,
    () => DEFAULT_MODEL,
  );
  return (
    <label className="flex items-center gap-2">
      <span className="text-muted-foreground">Model</span>
      <select
        value={model}
        onChange={(event) => {
          if (isModelId(event.target.value)) chooseModel(event.target.value);
        }}
        className="bg-background rounded-md border px-2 py-1"
      >
        {MODELS.map(({ id, label }) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function GenerativeUIPage() {
  const [adapter] = useState(() =>
    createLocalStorageAdapter({
      storage: browserStorage,
      titleGenerator: createSimpleTitleAdapter(),
    }),
  );
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: function GenerativeUIRuntime() {
      return useChatRuntime({
        transport,
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      });
    },
    adapter,
  });
  const [inspecting, setInspecting] = useState(false);

  return (
    <AssistantRuntimeProvider config={config} runtime={runtime}>
      <WidgetInstructions />
      <SidebarProvider>
        <div className="flex h-dvh w-full overflow-hidden">
          <ThreadListSidebar />
          <SidebarInset className="min-w-0">
            <ExampleNav />
            <div className="flex items-center gap-4 border-b px-4 py-2 text-sm">
              <SidebarTrigger />
              <ModelPicker />
              <button
                type="button"
                aria-pressed={inspecting}
                onClick={() => setInspecting((open) => !open)}
                className="hover:bg-muted ml-auto hidden rounded-md border px-2 py-1 lg:block"
              >
                {inspecting ? "Hide tool calls" : "Show tool calls"}
              </button>
            </div>
            <div className="flex min-h-0 flex-1">
              <div className="min-h-0 min-w-0 flex-1">
                <Thread />
              </div>
              {inspecting ? (
                <aside className="hidden w-[28rem] shrink-0 border-l lg:block">
                  <ToolCallInspector />
                </aside>
              ) : null}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
}
