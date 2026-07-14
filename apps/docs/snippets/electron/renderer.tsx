import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import type { ChatMessage } from "./shared";

const ipcChatModel: ChatModelAdapter = {
  async *run({ messages, context, abortSignal }) {
    if (abortSignal.aborted) return;

    const system = [context.system];
    const serializedMessages: ChatMessage[] = [];

    for (const message of messages) {
      const text = message.content
        .flatMap((part) => (part.type === "text" ? [part.text] : []))
        .join("\n");
      if (!text) continue;

      if (message.role === "system") system.push(text);
      if (message.role === "user") {
        serializedMessages.push({ role: "user", content: text });
      }
      if (message.role === "assistant") {
        serializedMessages.push({ role: "assistant", content: text });
      }
    }

    let stop: (() => void) | undefined;
    let removeAbortListener: (() => void) | undefined;
    const deltas = new ReadableStream<string>({
      start(controller) {
        let settled = false;
        const close = () => {
          if (settled) return;
          settled = true;
          controller.close();
        };
        const fail = (message: string) => {
          if (settled) return;
          settled = true;
          controller.error(new Error(message));
        };

        stop = window.assistantAI.streamChat(
          {
            ...(system.filter(Boolean).length
              ? { system: system.filter(Boolean).join("\n\n") }
              : {}),
            messages: serializedMessages,
          },
          (event) => {
            if (event.type === "delta") controller.enqueue(event.text);
            if (event.type === "done") close();
            if (event.type === "error") fail(event.message);
          },
        );

        const onAbort = () => {
          stop?.();
          close();
        };
        abortSignal.addEventListener("abort", onAbort, { once: true });
        removeAbortListener = () =>
          abortSignal.removeEventListener("abort", onAbort);
        if (abortSignal.aborted) onAbort();
      },
      cancel() {
        stop?.();
      },
    });

    const reader = deltas.getReader();
    let fullText = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return;
        fullText += value;
        yield { content: [{ type: "text", text: fullText }] };
      }
    } finally {
      removeAbortListener?.();
      stop?.();
      reader.releaseLock();
    }
  },
};

export function ElectronRuntimeProvider({ children }: { children: ReactNode }) {
  const runtime = useLocalRuntime(ipcChatModel);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
