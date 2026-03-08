"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  makeAssistantTool,
  useAui,
  useAuiState,
  AuiProvider,
  Suggestions,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import type { ToolCallMessagePart } from "@assistant-ui/react";
import { TerminalIcon, CodeIcon, EyeIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

const RenderHTMLTool = makeAssistantTool({
  toolName: "render_html",
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
      <div className="my-2 inline-flex items-center gap-2 rounded-full border bg-primary px-4 py-2 text-primary-foreground">
        <TerminalIcon className="size-4" />
        render_html(&#123; code: &quot;...&quot; &#125;)
      </div>
    );
  },
});

function ArtifactsView() {
  const [tab, setTab] = useState<"source" | "preview">("source");

  const lastToolCall = useAuiState((s) => {
    const messages = s.thread.messages;
    return messages
      .flatMap((m) =>
        m.content.filter(
          (c): c is ToolCallMessagePart =>
            c.type === "tool-call" && c.toolName === "render_html",
        ),
      )
      .at(-1);
  });

  const code = lastToolCall?.args["code"] as string | undefined;
  const isComplete = lastToolCall?.result !== undefined;

  if (!code) return null;

  return (
    <div className="flex flex-grow basis-full justify-stretch p-3">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border">
        <div className="flex border-b">
          <button
            onClick={() => setTab("source")}
            className={`inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 font-medium text-sm transition-colors ${
              tab === "source"
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CodeIcon className="size-4" />
            Source Code
          </button>
          <button
            onClick={() => isComplete && setTab("preview")}
            disabled={!isComplete}
            className={`inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 font-medium text-sm transition-colors ${
              !isComplete
                ? "cursor-not-allowed opacity-50"
                : tab === "preview"
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <EyeIcon className="size-4" />
            Preview
          </button>
        </div>
        {tab === "source" || !isComplete ? (
          <div className="h-full overflow-y-auto whitespace-pre-line break-words px-4 py-2 font-mono text-sm">
            {code}
          </div>
        ) : (
          <div className="flex h-full flex-grow px-4 py-2">
            <iframe
              className="h-full w-full"
              title="Artifact Preview"
              srcDoc={code}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ThreadWithSuggestions() {
  const aui = useAui({
    suggestions: Suggestions([
      {
        title: "Build a landing page",
        label: "with modern styling",
        prompt:
          "Build a beautiful landing page for a coffee shop with modern CSS.",
      },
      {
        title: "Create a calculator",
        label: "with HTML and JavaScript",
        prompt:
          "Create a calculator app with HTML, CSS, and JavaScript that supports basic arithmetic.",
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
  const runtime = useChatRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className="flex h-full justify-stretch">
        <div className="flex-grow basis-full">
          <ThreadWithSuggestions />
        </div>
        <RenderHTMLTool />
        <ArtifactsView />
      </main>
    </AssistantRuntimeProvider>
  );
}
