"use client";

import {
  useAui,
  AuiProvider,
  Suggestions,
  Tools,
  type Toolkit,
} from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";
import { PlusIcon } from "lucide-react";

const toolkit = {
  browser_alert: {
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
      <div className="mt-3 w-full max-w-(--thread-max-width) rounded-lg border px-4 py-3 text-sm">
        <p className="text-muted-foreground font-semibold">browser_alert</p>
        <p className="mt-1">
          Requested alert with message:
          <span className="text-foreground ml-1 font-mono">
            {JSON.stringify(args.message)}
          </span>
        </p>
        {result?.status === "shown" && (
          <p className="text-foreground/70 mt-2 text-xs">
            Alert displayed in this tab.
          </p>
        )}
      </div>
    ),
  },
} satisfies Toolkit;

function NewThreadButton() {
  const aui = useAui();

  return (
    <button
      type="button"
      onClick={() => aui.threads().switchToNewThread()}
      className="bg-background hover:bg-accent absolute top-4 right-4 z-10 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-colors"
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
  const aui = useAui({
    tools: Tools({ toolkit }),
  });

  return (
    <AuiProvider value={aui}>
      <main className="relative h-dvh">
        <NewThreadButton />
        <ThreadWithSuggestions />
      </main>
    </AuiProvider>
  );
}
