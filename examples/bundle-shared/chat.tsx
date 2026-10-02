import { useMemo, useRef, useCallback } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";
import { AssistantModal } from "@/components/assistant-ui/elements/assistant-modal.aui";
import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";

export type PreviewChatProps = {
  title: string;
  intro: string;
  suggestions: string[];
  modal?: boolean;
  onPrompt: (text: string, signal: AbortSignal) => string | Promise<string>;
};

function ChatContents({ intro }: Omit<PreviewChatProps, "onPrompt">) {
  const Welcome = useCallback(
    () => (
      <div className="aui-thread-welcome-root mb-6 flex flex-col px-2">
        <p className="text-2xl font-medium tracking-tight">{intro}</p>
      </div>
    ),
    [intro],
  );
  return <Thread autoFocus={false} components={{ Welcome }} />;
}

export function PreviewChat({
  onPrompt,
  modal = false,
  ...props
}: PreviewChatProps) {
  const promptRef = useRef(onPrompt);
  promptRef.current = onPrompt;
  const transport = useMemo<ChatTransport<UIMessage>>(
    () => ({
      async sendMessages({ messages, abortSignal }) {
        const last = messages
          .filter((message) => message.role === "user")
          .at(-1);
        const text =
          last?.parts
            .flatMap((part) => (part.type === "text" ? [part.text] : []))
            .join(" ") ?? "";
        const signal = abortSignal ?? new AbortController().signal;
        const response = await promptRef.current(text, signal);
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
    }),
    [],
  );
  const runtime = useChatRuntime({
    transport,
    suggestions: props.suggestions.map((prompt) => ({ prompt })),
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {modal ? (
        <AssistantModal />
      ) : (
        <section className="preview-chat" aria-label={props.title}>
          <header className="chat-heading">
            <h2>{props.title}</h2>
            <span>Local demo</span>
          </header>
          <ChatContents {...props} />
        </section>
      )}
    </AssistantRuntimeProvider>
  );
}
