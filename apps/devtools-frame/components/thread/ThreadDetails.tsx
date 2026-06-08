import { formatBoolean } from "../common";
import { MessageList } from "../message";
import { SummaryItem } from "../ui";
import { ComposerAttachments } from "./ComposerAttachments";
import { ComposerFlags } from "./ComposerFlags";
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
      <SummaryItem label="Messages" value={String(thread.messages.length)} />
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
      <div className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200">
        <div className="text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          Composer
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryItem label="Role" value={thread.composer.role ?? "—"} />
          <SummaryItem
            label="Text Length"
            value={String(thread.composer.textLength)}
          />
          <SummaryItem
            label="Attachments"
            value={String(thread.composer.attachments.length)}
          />
          {typeof thread.composer.type === "string" ? (
            <SummaryItem label="Mode" value={thread.composer.type} />
          ) : null}
        </div>
        <ComposerFlags composer={thread.composer} />
        <ComposerAttachments attachments={thread.composer.attachments} />
        <ComposerQueue queue={thread.composer.queue} />
      </div>
    ) : null}
  </div>
);
