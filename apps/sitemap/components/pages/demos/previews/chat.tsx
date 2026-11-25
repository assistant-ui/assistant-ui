"use client";

import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { Thread } from "@/components/pages/demos/ui/thread";
import { lastUserText, streamWords, wait } from "./script";

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
    for await (const text of streamWords(reply, abortSignal)) {
      yield { content: [{ type: "text", text }] };
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
