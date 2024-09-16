"use client";

import { FC } from "react";
import {
  AssistantModal,
  AssistantModalPrimitive,
  ChatModelAdapter,
  useLocalRuntime,
} from "@assistant-ui/react";
import { makeMarkdownText } from "@assistant-ui/react-markdown";
import { makePrismAsyncSyntaxHighlighter } from "@assistant-ui/react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { Thread, type ThreadConfig } from "@assistant-ui/react";
import entelligenceLogoLight from "./entelligence-light.png";
import entelligenceLogoDark from "./entelligence-dark.png";
import Image from "next/image";
import { Composer, ThreadWelcome } from "@assistant-ui/react";

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
    <MyAssistantModal
      runtime={runtime}
      welcome={{
        message: "Ask any question about assistant-ui",
      }}
      assistantMessage={{ components: { Text: MarkdownText } }}
    />
  );
};

const MyAssistantModal: FC<ThreadConfig> = (config) => {
  return (
    <AssistantModal.Root config={config}>
      <MyAssistantModalTrigger />
      <AssistantModal.Content className="h-[800px] w-[600px]">
        <MyThread />
      </AssistantModal.Content>
    </AssistantModal.Root>
  );
};

const MyAssistantModalTrigger: FC = () => {
  return (
    <AssistantModal.Anchor className="hidden md:block">
      <AssistantModalPrimitive.Trigger asChild>
        <AssistantModal.Button />
      </AssistantModalPrimitive.Trigger>
    </AssistantModal.Anchor>
  );
};

const MyThread: FC = () => {
  return (
    <Thread.Root className="flex flex-col">
      <Thread.Viewport>
        <ThreadWelcome />

        <Thread.Messages />

        <Thread.ViewportFooter className="pb-3">
          <Thread.ScrollToBottom />
          <Composer />
        </Thread.ViewportFooter>
      </Thread.Viewport>

      <a
        href="https://entelligence.ai"
        className="text-muted-foreground flex w-full items-center justify-center gap-2 border-t py-2 text-xs"
      >
        In partnership with{" "}
        <Image
          src={entelligenceLogoLight}
          className="dark:hidden"
          alt="Entelligence Logo"
          height={14}
          width={113}
        />
        <Image
          src={entelligenceLogoDark}
          className="hidden dark:block"
          alt="Entelligence Logo"
          height={14}
          width={113}
        />
      </a>
    </Thread.Root>
  );
};
