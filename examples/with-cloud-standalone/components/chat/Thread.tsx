"use client";

import type { UIMessage } from "ai";
import { Message } from "./Message";

type ThreadProps = {
  messages: UIMessage[];
  isLoading: boolean;
  children?: React.ReactNode;
};

function ThreadWelcome() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <h2 className="font-semibold text-lg">How can I help you today?</h2>
      <p className="mt-1 text-muted-foreground text-sm">
        Send a message to start a conversation.
      </p>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-2">
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
    </div>
  );
}

export function Thread({ messages, isLoading, children }: ThreadProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <ThreadWelcome />
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-4">
            {messages.map((msg) => (
              <Message key={msg.id} message={msg} />
            ))}
            {isLoading && <LoadingIndicator />}
          </div>
        )}
      </div>
      <div className="mx-auto w-full max-w-3xl">{children}</div>
    </div>
  );
}
