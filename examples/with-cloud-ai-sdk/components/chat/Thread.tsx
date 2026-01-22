"use client";

import type { UIMessage } from "ai";
import { Message } from "./Message";
import { MessageCircle } from "lucide-react";

type ThreadProps = {
  messages: UIMessage[];
  isRunning: boolean;
  children?: React.ReactNode;
};

function ThreadWelcome() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <MessageCircle className="size-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">How can I help you today?</h2>
        <p className="text-muted-foreground">
          Send a message to start a conversation.
        </p>
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex items-center gap-2 py-4">
      <div className="flex gap-1">
        <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
        <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
        <span className="size-2 animate-bounce rounded-full bg-muted-foreground" />
      </div>
      <span className="text-sm text-muted-foreground">Thinking...</span>
    </div>
  );
}

export function Thread({ messages, isRunning, children }: ThreadProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        {messages.length === 0 ? (
          <ThreadWelcome />
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-4">
            {messages.map((msg) => (
              <Message key={msg.id} message={msg} />
            ))}
            {isRunning && <LoadingIndicator />}
          </div>
        )}
      </div>
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    </div>
  );
}
