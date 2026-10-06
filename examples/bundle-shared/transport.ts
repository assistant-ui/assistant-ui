import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";

export const createPreviewTransport = (
  onPrompt: (text: string, signal: AbortSignal) => string | Promise<string>,
): ChatTransport<UIMessage> => ({
  async sendMessages({ messages, abortSignal }) {
    const last = messages.filter((message) => message.role === "user").at(-1);
    const text =
      last?.parts
        .flatMap((part) => (part.type === "text" ? [part.text] : []))
        .join(" ") ?? "";
    const signal = abortSignal ?? new AbortController().signal;
    const response = await onPrompt(text, signal);
    signal.throwIfAborted();
    let cancelled = false;
    return new ReadableStream<UIMessageChunk>({
      async start(controller) {
        controller.enqueue({
          type: "start",
          messageId: crypto.randomUUID(),
        });
        controller.enqueue({ type: "text-start", id: "response" });
        try {
          for (const delta of response.match(/.{1,18}/gs) ?? []) {
            if (cancelled) return;
            signal.throwIfAborted();
            controller.enqueue({
              type: "text-delta",
              id: "response",
              delta,
            });
            await new Promise((resolve) => setTimeout(resolve, 22));
          }
          if (cancelled) return;
          signal.throwIfAborted();
          controller.enqueue({ type: "text-end", id: "response" });
          controller.enqueue({ type: "finish", finishReason: "stop" });
          controller.close();
        } catch (error) {
          if (!cancelled) controller.error(error);
        }
      },
      cancel() {
        cancelled = true;
      },
    });
  },
  async reconnectToStream() {
    return null;
  },
});
