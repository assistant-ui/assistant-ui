import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";

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
