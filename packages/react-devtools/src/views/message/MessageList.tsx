import { useState } from "react";
import { SectionLabel } from "../ui";
import { MessageItem } from "./MessageItem";
import type { MessagePreview } from "./types";

const DEFAULT_LIMIT = 20;

export const MessageList = ({
  messages,
  title = "Messages",
}: {
  messages: readonly MessagePreview[];
  title?: string;
}) => {
  const [showAll, setShowAll] = useState(false);

  if (!messages.length) {
    return (
      <div className="bg-card text-muted-foreground rounded-lg border p-4 text-center text-[11px]">
        No messages in this thread.
      </div>
    );
  }

  const hidden = showAll ? 0 : Math.max(0, messages.length - DEFAULT_LIMIT);
  const visible = hidden > 0 ? messages.slice(-DEFAULT_LIMIT) : messages;

  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <div className="bg-muted flex items-center justify-between border-b px-3 py-2">
        <SectionLabel>{title}</SectionLabel>
        <span className="text-muted-foreground text-[10px]">
          {messages.length} total
        </span>
      </div>
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="bg-muted text-muted-foreground hover:bg-accent w-full border-b px-3 py-1.5 text-[10px] font-medium transition-colors"
        >
          Show {hidden} older message{hidden === 1 ? "" : "s"}
        </button>
      ) : null}
      <div className="divide-border divide-y">
        {visible.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>
    </div>
  );
};
