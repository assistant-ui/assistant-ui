import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";
import { useAui, type AssistantClient } from "@assistant-ui/store";
import { flushTapSync } from "@assistant-ui/tap";

export const createControlledTransport = () => {
  let controller!: ReadableStreamDefaultController<UIMessageChunk>;
  const transport: ChatTransport<UIMessage> = {
    sendMessages: async () =>
      new ReadableStream<UIMessageChunk>({
        start(c) {
          controller = c;
        },
      }),
    reconnectToStream: async () => null,
  };
  return {
    transport,
    emit: (...chunks: UIMessageChunk[]) => {
      for (const chunk of chunks) controller.enqueue(chunk);
    },
    close: () => controller.close(),
  };
};

export const createCancellableTransport = () => {
  let cancelCount = 0;
  let controller!: ReadableStreamDefaultController<UIMessageChunk>;
  const transport: ChatTransport<UIMessage> = {
    sendMessages: async () =>
      new ReadableStream<UIMessageChunk>({
        start(c) {
          controller = c;
        },
        cancel() {
          cancelCount++;
        },
      }),
    reconnectToStream: async () => null,
  };
  return {
    transport,
    getCancelCount: () => cancelCount,
    close: () => controller.close(),
  };
};

export const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

export const createStreamHarness = () => {
  let aui: AssistantClient | undefined;
  const Probe = () => {
    aui = useAui();
    return null;
  };
  return {
    Probe,
    send: () => {
      flushTapSync(() => aui!.composer.setText("keep streaming"));
      flushTapSync(() => aui!.composer.send());
    },
    isRunning: () => aui?.thread.getState().isRunning === true,
    client: () => aui!,
  };
};
