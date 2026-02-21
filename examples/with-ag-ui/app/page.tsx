"use client";

import {
  useAssistantRuntime,
  useAssistantTool,
  useAui,
  AuiProvider,
  Suggestions,
} from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";
import { PlusIcon } from "lucide-react";

function BrowserAlertTool() {
  useAssistantTool<{ message: string }, { status: string }>({
    toolName: "browser_alert",
    description: "Display a native browser alert dialog to the user.",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Text to display inside the alert dialog.",
        },
      },
      required: ["message"],
    },
    execute: async ({ message }) => {
      alert(message);
      return { status: "shown" };
    },
    render: ({ args, result }) => (
      <div className="mt-3 w-full max-w-[var(--thread-max-width)] rounded-lg border px-4 py-3 text-sm">
        <p className="font-semibold text-muted-foreground">browser_alert</p>
        <p className="mt-1">
          Requested alert with message:
          <span className="ml-1 font-mono text-foreground">
            {JSON.stringify(args.message)}
          </span>
        </p>
        {result?.status === "shown" && (
          <p className="mt-2 text-foreground/70 text-xs">
            Alert displayed in this tab.
          </p>
        )}
      </div>
    ),
  });

  return null;
}

function NewThreadButton() {
  const runtime = useAssistantRuntime();

  return (
    <button
      onClick={() => runtime.switchToNewThread()}
      className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-lg border bg-background px-3 py-2 font-medium text-sm shadow-sm transition-colors hover:bg-accent"
    >
      <PlusIcon className="size-4" />
      New Thread
    </button>
  );
}

function ThreadWithSuggestions() {
  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "Run a web search",
        label: "for recent AI news",
        prompt: "Search the web for the latest AI news.",
      },
      {
        title: "Show a browser alert",
        label: "using the alert tool",
        prompt: "Show me a browser alert saying hello!",
      },
    ]),
  });
  return (
    <AuiProvider value={aui}>
      <Thread />
    </AuiProvider>
  );
}

export default function Home() {
  return (
    <main className="relative h-dvh">
      <NewThreadButton />
      <ThreadWithSuggestions />
      <BrowserAlertTool />
    </main>
  );
}
