"use client";

import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
  Tools,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { lastUserText, streamWords, wait } from "./script";
import { PROMPTS, Thread, followUps, toolkit } from "./thread";

const [HOW, SETUP] = PROMPTS as [string, string];

const REPLIES: Record<string, string> = {
  [HOW]: `The Thread is the whole chat: the messages, the composer, and the empty state you started from.

It is built from primitives (\`ThreadPrimitive\`, \`MessagePrimitive\`, \`ComposerPrimitive\`) that read everything from the runtime. \`useChatRuntime\` sends your message to \`/api/chat\` and streams the reply back, and the Thread draws each message as it changes.

Every part is a component in one file, so you can restyle it, move it, or replace it.`,
  [SETUP]:
    "Add the Thread with the shadcn CLI, which copies `thread.tsx` into your project for you to change, or give the prompt to your coding agent.",
};

const FALLBACK =
  "This demo answers from a script, so it only knows its two questions. Try one of the suggestions below.";

/**
 * Stands in for `useChatRuntime` and the route: streams the scripted reply,
 * and for the set-up question calls `showSetup` the way the model would.
 */
const scriptedThread: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const asked = lastUserText(messages);
    await wait(350);

    let text = "";
    for await (const shown of streamWords(
      REPLIES[asked] ?? FALLBACK,
      abortSignal,
    )) {
      text = shown;
      yield { content: [{ type: "text", text }] };
    }

    if (asked === SETUP && !abortSignal.aborted) {
      yield {
        content: [
          { type: "text", text },
          {
            type: "tool-call",
            toolCallId: `setup-${messages.length}`,
            toolName: "showSetup",
            args: {},
            argsText: "{}",
            result: {},
          },
        ],
      };
    }
  },
};

/** `thread.tsx` with its runtime swapped for a script: the same Thread, suggestions, follow-ups, and card. */
export function ThreadPreview() {
  const runtime = useLocalRuntime(scriptedThread, {
    adapters: { suggestion: followUps },
  });
  const config = AuiConfig({
    suggestions: Suggestions(PROMPTS),
    tools: Tools({ toolkit }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
