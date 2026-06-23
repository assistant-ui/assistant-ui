import { useState } from "react";
import { InfoCard } from "../ui";
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
      <InfoCard title={title}>
        <p className="text-muted-foreground text-[12px]">
          No messages in this thread.
        </p>
      </InfoCard>
    );
  }

  const hidden = showAll ? 0 : Math.max(0, messages.length - DEFAULT_LIMIT);
  const visible = hidden > 0 ? messages.slice(-DEFAULT_LIMIT) : messages;

  return (
    <InfoCard title={title} count={messages.length}>
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-muted-foreground hover:text-foreground self-start text-[11px] font-medium transition-colors"
        >
          Show {hidden} older message{hidden === 1 ? "" : "s"}
        </button>
      ) : null}
      <div className="divide-border divide-y">
        {visible.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>
    </InfoCard>
  );
};
