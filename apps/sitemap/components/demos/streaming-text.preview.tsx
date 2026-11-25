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
import { PROMPTS, Thread, followUps, toolkit } from "./streaming-text";

const [HOW, SETUP] = PROMPTS as [string, string];

/** One paragraph each: the Streaming text element draws words, not line breaks. */
const REPLIES: Record<string, string> = {
  [HOW]:
    "The model writes its answer a few words at a time, and each piece is sent the moment it exists. useChatRuntime reads that stream from your route and adds each piece to the reply, and the Streaming text element draws it as it grows: the newest words tinted, a caret at the end, settling into ink as more arrive. Press Stop while it streams, and the reply ends where it is.",
  [SETUP]:
    "Add the Loader and Streaming text elements with the shadcn CLI, or give the prompt to your coding agent.",
};

const FALLBACK =
  "This demo answers from a script, so it only knows its two questions. Try one of the suggestions below.";

/**
 * Stands in for `useChatRuntime` and the route: waits long enough for the
 * Loader to show, streams the scripted reply, and for the set-up question
 * calls `showSetup` the way the model would.
 */
const scriptedStream: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const asked = lastUserText(messages);
    await wait(900);

    let text = "";
    for await (const shown of streamWords(
      REPLIES[asked] ?? FALLBACK,
      abortSignal,
      45,
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

/** `streaming-text.tsx` with its runtime swapped for a script: the same Thread, suggestions, follow-ups, and card. */
export function StreamingTextPreview() {
  const runtime = useLocalRuntime(scriptedStream, {
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
