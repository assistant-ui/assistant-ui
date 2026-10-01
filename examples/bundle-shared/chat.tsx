import { useMemo, useRef } from "react";
import {
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
} from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";

export type PreviewChatProps = {
  title: string;
  intro: string;
  suggestions: string[];
  onPrompt: (text: string, signal: AbortSignal) => string | Promise<string>;
};

function Message() {
  return (
    <MessagePrimitive.Root className="preview-message">
      <AuiIf condition={(s) => s.message.role === "user"}>
        <span className="message-author">You</span>
      </AuiIf>
      <AuiIf condition={(s) => s.message.role === "assistant"}>
        <span className="message-author">Assistant</span>
      </AuiIf>
      <div className="message-text">
        <MessagePrimitive.Parts />
      </div>
      <AuiIf condition={(s) => s.message.role === "assistant"}>
        <ActionBarPrimitive.Root hideWhenRunning className="message-actions">
          <ActionBarPrimitive.Copy>Copy</ActionBarPrimitive.Copy>
          <ActionBarPrimitive.Reload>Regenerate</ActionBarPrimitive.Reload>
        </ActionBarPrimitive.Root>
      </AuiIf>
    </MessagePrimitive.Root>
  );
}

function ChatContents({
  title,
  intro,
  suggestions,
}: Omit<PreviewChatProps, "onPrompt">) {
  const aui = useAui();
  return (
    <ThreadPrimitive.Root className="preview-chat" aria-label={title}>
      <header className="chat-heading">
        <h2>{title}</h2>
        <span>Local demo</span>
      </header>
      <ThreadPrimitive.Viewport className="chat-viewport">
        <ThreadPrimitive.Empty>
          <div className="chat-welcome">
            <h3>{intro}</h3>
            <p>Scripted responses. No model key required.</p>
            <div className="chat-suggestions">
              {suggestions.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => aui.thread().append(prompt)}
                >
                  {prompt}
                  <span aria-hidden>↗</span>
                </button>
              ))}
            </div>
          </div>
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages>{() => <Message />}</ThreadPrimitive.Messages>
      </ThreadPrimitive.Viewport>
      <ComposerPrimitive.Root className="preview-composer">
        <ComposerPrimitive.Input
          aria-label="Message the assistant"
          placeholder="Ask a question…"
          rows={2}
        />
        <AuiIf condition={(s) => !s.thread.isRunning}>
          <ComposerPrimitive.Send>Send</ComposerPrimitive.Send>
        </AuiIf>
        <AuiIf condition={(s) => s.thread.isRunning}>
          <ComposerPrimitive.Cancel>Stop</ComposerPrimitive.Cancel>
        </AuiIf>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  );
}

export function PreviewChat({ onPrompt, ...props }: PreviewChatProps) {
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
  const runtime = useChatRuntime({ transport });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatContents {...props} />
    </AssistantRuntimeProvider>
  );
}
