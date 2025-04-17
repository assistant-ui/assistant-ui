"use client";

import {
  AssistantRuntimeProvider,
  ChatModelAdapter,
  useLocalRuntime,
} from "@assistant-ui/react";
import { AssistantModal } from "./assistant-modal";

function asAsyncIterable<T>(source: ReadableStream<T>): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]: () => {
      const reader = source.getReader();
      return {
        async next(): Promise<IteratorResult<T, undefined>> {
          const { done, value } = await reader.read();
          return done
            ? { done: true, value: undefined }
            : { done: false, value };
        },
      };
    },
  };
}

const MyCustomAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const messagesToSend = messages.map((m) => ({
      role: m.role,
      content: m.content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join(" "),
    }));

    const response = await fetch("/api/entelligence", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messagesToSend,
      }),
      signal: abortSignal,
    });

    let text = "";
    for await (const chunk of asAsyncIterable(
      response.body!.pipeThrough(new TextDecoderStream()),
    )) {
      text += chunk;
      yield { content: [{ type: "text", text }] };
    }

    void fetch("/api/entelligence-history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: messagesToSend.at(-1)?.content,
        answer: text,
        previousQuestion: messagesToSend.at(-3)?.content,
      }),
    });
  },
};

export const DocsChat = () => {
  const runtime = useLocalRuntime(MyCustomAdapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantModal />
    </AssistantRuntimeProvider>
  );
};
