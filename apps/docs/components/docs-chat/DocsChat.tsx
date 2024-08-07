"use client";

import {
  AssistantModal,
  ChatModelAdapter,
  useLocalRuntime,
} from "@assistant-ui/react";
import { makeMarkdownText } from "@assistant-ui/react-markdown";
import { makePrismAsyncSyntaxHighlighter } from "@assistant-ui/react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

co asAsyncIterable<T>(source: ReadableStream<T>): AsyncIterable<T> {
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
  },
};

const SyntaxHighlighter = makePrismAsyncSyntaxHighlighter({
  style: coldarkDark,
  customStyle: {
    margin: 0,
    backgroundColor: "black",
  },
});
const MarkdownText = makeMarkdownText({
  remarkPlugins: [remarkGfm],
  components: {
    SyntaxHighlighter,
  },
});

export const DocsChat = () => {
  const runtime = useLocalRuntime(MyCustomAdapter);

  return (
    <AssistantModal
      runtime={runtime}
      welcome={{
        message: "Ask me anything about the docs!",
      }}
      assistantMessage={{ components: { Text: MarkdownText } }}
    />
  );
};
