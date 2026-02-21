"use client";

import { Thread } from "@/components/assistant-ui/thread";
import {
  AssistantRuntimeProvider,
  makeAssistantTool,
  useAuiState,
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
  const [tab, setTab] = useState<"source" | "preview">("preview");

  const artifact = useAuiState((s) => {
    const messages = s.thread.messages;
    return messages
      .flatMap((m) =>
        m.content.filter(
          (c): c is ToolCallMessagePart =>
            c.type === "tool-call" &&
            c.toolName === "render_html" &&
            c.result !== undefined,
        ),
      )
      .at(-1)?.args["code"] as string | undefined;
  });

  if (!artifact) return null;

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
            onClick={() => setTab("preview")}
            className={`inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 font-medium text-sm transition-colors ${
              tab === "preview"
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <EyeIcon className="size-4" />
            Preview
          </button>
        </div>
        {tab === "source" ? (
          <div className="h-full overflow-y-auto whitespace-pre-line break-words px-4 py-2 font-mono text-sm">
            {artifact}
          </div>
        ) : (
          <div className="flex h-full flex-grow px-4 py-2">
            <iframe
              className="h-full w-full"
              title="Artifact Preview"
              srcDoc={artifact}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const runtime = useChatRuntime();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <main className="flex h-full justify-stretch">
        <div className="flex-grow basis-full">
          <Thread />
        </div>
        <RenderHTMLTool />
        <ArtifactsView />
      </main>
    </AssistantRuntimeProvider>
  );
}
