import { formatBoolean } from "../common";
import { MessageList } from "../message";
import { SummaryItem } from "../ui";
import { ComposerQueue } from "./ComposerQueue";
import type { ThreadPreview } from "./types";

export const ThreadDetails = ({
  thread,
  title,
}: {
  thread: ThreadPreview;
  title?: string;
}) => (
  <div className="flex flex-col gap-3">
    {title ? (
      <div className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        {title}
      </div>
    ) : null}
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryItem label="Messages" value={String(thread.messageCount)} />
      {typeof thread.isLoading === "boolean" ? (
        <SummaryItem
          label="Loading"
          value={formatBoolean(thread.isLoading) ?? "—"}
        />
      ) : null}
      {typeof thread.isRunning === "boolean" ? (
        <SummaryItem
          label="Running"
          value={formatBoolean(thread.isRunning) ?? "—"}
        />
      ) : null}
      {thread.isDisabled !== undefined ? (
        <SummaryItem
          label="Disabled"
          value={formatBoolean(thread.isDisabled) ?? "—"}
        />
      ) : null}
    </div>

    {thread.capabilities.length ? (
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200">
        <div className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          Capabilities
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {thread.capabilities.map((capability) => (
            <span
              key={capability}
              className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-zinc-600 uppercase dark:bg-zinc-800 dark:text-zinc-300"
            >
              {capability}
            </span>
          ))}
        </div>
      </div>
    ) : null}

    <MessageList messages={thread.messages} />

    {thread.suggestions.length ? (
      <div className="rounded-md border border-dashed border-zinc-300 bg-white p-3 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-200">
        <div className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          Suggestions
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {thread.suggestions.map((suggestion, index) => (
            <li key={index}>{suggestion.prompt || "(empty)"}</li>
          ))}
        </ul>
      </div>
    ) : null}

    {thread.composer ? (
      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200">
        <div className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          Composer
        </div>
        <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryItem label="Role" value={thread.composer.role ?? "—"} />
          <SummaryItem
            label="Text Length"
            value={String(thread.composer.textLength)}
          />
          <SummaryItem
            label="Attachments"
            value={String(thread.composer.attachments)}
          />
          {typeof thread.composer.type === "string" ? (
            <SummaryItem label="Mode" value={thread.composer.type} />
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          {typeof thread.composer.isEditing === "boolean" ? (
            <span>Edit: {formatBoolean(thread.composer.isEditing)}</span>
          ) : null}
          {typeof thread.composer.canCancel === "boolean" ? (
            <span>Can Cancel: {formatBoolean(thread.composer.canCancel)}</span>
          ) : null}
          {typeof thread.composer.canSend === "boolean" ? (
            <span>Can Send: {formatBoolean(thread.composer.canSend)}</span>
          ) : null}
          {typeof thread.composer.isEmpty === "boolean" ? (
            <span>Empty: {formatBoolean(thread.composer.isEmpty)}</span>
          ) : null}
        </div>

        {thread.composer.queue.length ? (
          <div className="mt-2">
            <ComposerQueue queue={thread.composer.queue} />
          </div>
        ) : null}
      </div>
    ) : null}
  </div>
);
