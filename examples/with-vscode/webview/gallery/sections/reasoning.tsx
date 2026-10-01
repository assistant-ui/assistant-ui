import type { ThreadMessageLike } from "@assistant-ui/react";
import {
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger,
} from "@assistant-ui/ui/components/assistant-ui/elements/reasoning.aui.tsx";
import { defineSections } from "../types";
import { SeededRuntime, SeededThread } from "../runtime";
import { State, States } from "./_states";

const THOUGHT =
  "The webview cannot call the backend directly, so requests travel over postMessage to the extension host. The host runs the route handler and streams the response back, which keeps the API key out of the webview.";

function Composed({
  variant,
  open,
}: {
  variant: "outline" | "ghost" | "muted";
  open: boolean;
}) {
  return (
    <ReasoningRoot variant={variant} defaultOpen={open} className="mb-0">
      <ReasoningTrigger />
      <ReasoningContent>
        <ReasoningText>
          <p>Let me think about this step by step.</p>
          <p>{THOUGHT}</p>
        </ReasoningText>
      </ReasoningContent>
    </ReasoningRoot>
  );
}

const reasoningThread = (running: boolean): ThreadMessageLike[] => [
  { role: "user", content: "How does the webview reach my backend?" },
  {
    role: "assistant",
    ...(running && { status: { type: "running" } as const }),
    content: [
      { type: "reasoning", text: THOUGHT },
      ...(running
        ? []
        : [
            {
              type: "text" as const,
              text: "It tunnels **fetch** over `postMessage`; the extension host runs the route handler and streams the response back.",
            },
          ]),
    ],
  },
];

export default defineSections([
  {
    id: "reasoning",
    title: "Reasoning (composed)",
    category: "agents",
    notes:
      "reasoning.aui.tsx parts: outline open, ghost closed and muted open. The trigger toggles.",
    render: () => (
      <SeededRuntime>
        <States>
          <State label="outline, open">
            <Composed variant="outline" open />
          </State>
          <State label="ghost, closed">
            <Composed variant="ghost" open={false} />
          </State>
          <State label="muted, open">
            <Composed variant="muted" open />
          </State>
        </States>
      </SeededRuntime>
    ),
  },
  {
    id: "reasoning-thread",
    title: "Reasoning in a thread",
    category: "agents",
    notes:
      "A settled reasoning part before the answer, collapsed by the kit Thread.",
    render: () => (
      <SeededThread messages={reasoningThread(false)} className="h-80" />
    ),
  },
  {
    id: "reasoning-thread-streaming",
    title: "Reasoning streaming",
    category: "agents",
    notes:
      "The assistant message is still running on its reasoning part, so the disclosure holds open on a live preview.",
    render: () => (
      <SeededThread messages={reasoningThread(true)} className="h-80" />
    ),
  },
]);
