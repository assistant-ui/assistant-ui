import { useState } from "react";
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
      <div className="rounded-md border border-dashed border-zinc-300 bg-white p-4 text-center text-[11px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400">
        No messages in this thread.
      </div>
    );
  }

  const hidden = showAll ? 0 : Math.max(0, messages.length - DEFAULT_LIMIT);
  const visible = hidden > 0 ? messages.slice(-DEFAULT_LIMIT) : messages;

  return (
    <div className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-100 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          {title}
        </span>
        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
          {messages.length} total
        </span>
      </div>
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[10px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Show {hidden} older message{hidden === 1 ? "" : "s"}
        </button>
      ) : null}
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {visible.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>
    </div>
  );
};
