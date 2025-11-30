"use client";

import { useAssistantTool } from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/thread";

const BrowserAlertTool = () => {
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
};

export default function Home() {
  return (
    <main className="h-dvh">
      <Thread />
      <BrowserAlertTool />
    </main>
  );
}
