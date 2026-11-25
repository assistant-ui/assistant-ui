"use client";

import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
  type ThreadMessage,
} from "@assistant-ui/react";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function lastUserText(messages: readonly ThreadMessage[]) {
  const message = messages.findLast((entry) => entry.role === "user");
  return (message?.content ?? [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .trim();
}

function quote(text: string) {
  return text.length > 60 ? `${text.slice(0, 60).trimEnd()}…` : text;
}

function replyTo(prompt: string) {
  if (/^(hi|hello|hey)\b/i.test(prompt)) {
    return "Hi. This chat runs on a script on this page, so you can try the Thread without a model. Ask anything, and the reply streams in word by word.";
  }
  return `This reply comes from a script on this page, so no model read “${quote(prompt)}”.

With a model, the same steps run:

1. \`useChatRuntime\` sends your message to \`/api/chat\`.
2. The route calls the model with \`streamText\`.
3. The reply streams back into \`<Thread />\` word by word, like this one.`;
}

/** Stands in for `useChatRuntime`: the same Thread, with replies from a script instead of the route. */
const scriptedChat: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const reply = replyTo(lastUserText(messages));
    await wait(350);
    let shown = "";
    for (const word of reply.split(/(?<=\s)/)) {
      if (abortSignal.aborted) return;
      shown += word;
      yield { content: [{ type: "text", text: shown }] };
      await wait(30);
    }
  },
};

export function ChatPreview() {
  const runtime = useLocalRuntime(scriptedChat);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
