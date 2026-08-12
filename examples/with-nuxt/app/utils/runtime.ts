import type { ChatModelAdapter } from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  getThreadMessageText,
  LocalRuntimeCore,
} from "@assistant-ui/core/internal";
import {
  AssistantMessageAccumulator,
  UIMessageStreamDecoder,
} from "assistant-stream";
import { asAsyncIterableStream } from "assistant-stream/utils";

const chatModel: ChatModelAdapter = {
  async *run({ messages, abortSignal, context }) {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: context.system,
        messages: messages.map((message) => ({
          role: message.role,
          content: getThreadMessageText(message),
        })),
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}: ${await response.text()}`);
    }
    if (!response.body) {
      throw new Error("Response body is null");
    }

    const stream = response.body
      .pipeThrough(new UIMessageStreamDecoder())
      .pipeThrough(new AssistantMessageAccumulator());

    yield* asAsyncIterableStream(stream);
  },
};

export const createChatRuntime = () =>
  new AssistantRuntimeImpl(
    new LocalRuntimeCore({ adapters: { chatModel } }, undefined),
  );
