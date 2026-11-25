"use client";

import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { lastUserText, streamWords, wait } from "./script";
import { PROMPTS, Thread, followUps } from "./streaming-text";

const [HOW, STOP] = PROMPTS as [string, string];

const REPLIES: Record<string, { text: string; delay: number }> = {
  [HOW]: {
    delay: 30,
    text: `The model writes its answer a few words at a time, and each piece is sent the moment it exists.

On the server, \`streamText\` turns the model's output into a stream. On the page, \`useChatRuntime\` reads that stream and adds each piece to the last message, and the Thread draws the message again, so the words arrive as they are written, like these.

This reply comes from a script on this page, streamed the same way.`,
  },
  [STOP]: {
    delay: 90,
    text: `Yes. While a reply streams, the send button turns into a stop button. Press it now, and this message ends where it is.

Stopping calls \`cancelRun\`, which aborts the request to your route, so the model stops writing. Every word that arrived before you pressed it stays in the message, because each one was added as it came in. Retry asks again from the start, and the new reply streams in the same way, a few words at a time, until it finishes or you stop it again.`,
  },
};

const FALLBACK = {
  delay: 30,
  text: "This demo answers from a script, so it only knows its two questions. Try one of the suggestions below.",
};

/** Stands in for `useChatRuntime` and the route: streams the scripted reply to the last question. */
const scriptedStream: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const reply = REPLIES[lastUserText(messages)] ?? FALLBACK;
    await wait(350);
    for await (const text of streamWords(
      reply.text,
      abortSignal,
      reply.delay,
    )) {
      yield { content: [{ type: "text", text }] };
    }
  },
};

/** `streaming-text.tsx` with its runtime swapped for a script: the same Thread, suggestions, and follow-ups. */
export function StreamingTextPreview() {
  const runtime = useLocalRuntime(scriptedStream, {
    adapters: { suggestion: followUps },
  });
  const config = AuiConfig({ suggestions: Suggestions(PROMPTS) });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
