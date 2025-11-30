import { SummaryItem } from "../ui";
import type { ThreadPreview } from "./types";
import { formatBoolean, formatDateTime } from "./utils";

export const ThreadDetails = ({
  thread,
  title,
}: {
  thread: ThreadPreview;
  title?: string;
}) => (
  <div className="flex flex-col gap-3">
    {title ? (
      <div className="font-semibold text-[10px] text-zinc-500 uppercase tracking-wide dark:text-zinc-400">
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
        <div className="font-semibold text-[10px] text-zinc-500 uppercase tracking-wide dark:text-zinc-400">
          Capabilities
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {thread.capabilities.map((capability) => (
            <span
              key={capability}
              className="rounded bg-zinc-200 px-1.5 py-0.5 font-medium text-[10px] text-zinc-600 uppercase tracking-wide dark:bg-zinc-800 dark:text-zinc-300"
            >
              {capability}
            </span>
          ))}
        </div>
      </div>
    ) : null}

    {thread.messages.length ? (
      <div className="rounded-md border border-zinc-200 bg-white text-[11px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
        <div className="border-zinc-200 border-b bg-zinc-100 px-3 py-2 font-semibold text-[10px] text-zinc-500 uppercase tracking-wide dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Recent Messages
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {thread.messages
            .slice(-5)
            .reverse()
            .map((message) => (
              <div key={message.id} className="flex flex-col gap-1 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-zinc-800 capitalize dark:text-zinc-100">
                    {message.role}
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {formatDateTime(message.createdAt) ?? "—"}
                  </span>
                </div>
                {message.summary ? (
                  <div className="text-zinc-600 dark:text-zinc-300">
                    {message.summary}
                  </div>
                ) : (
                  <div className="text-zinc-500 dark:text-zinc-400">
                    No textual content
                  </div>
                )}
                {message.attachments.length ? (
                  <div className="flex flex-wrap gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                    {message.attachments.map((attachment, index) => (
                      <span
                        key={`${message.id}-attachment-${index}`}
                        className="rounded bg-zinc-200 px-1.5 py-0.5 font-medium text-[10px] text-zinc-600 uppercase tracking-wide dark:bg-zinc-800 dark:text-zinc-300"
                      >
                        {attachment}
                      </span>
                    ))}
                  </div>
                ) : null}
                {message.status ? (
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wide dark:text-zinc-400">
                    Status: {message.status}
                  </div>
                ) : null}
              </div>
            ))}
        </div>
      </div>
    ) : null}

    {thread.suggestions.length ? (
      <div className="rounded-md border border-zinc-300 border-dashed bg-white p-3 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-200">
        <div className="font-semibold text-[10px] text-zinc-500 uppercase tracking-wide dark:text-zinc-400">
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
        <div className="font-semibold text-[10px] text-zinc-500 uppercase tracking-wide dark:text-zinc-400">
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
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-zinc-500 uppercase tracking-wide dark:text-zinc-400">
          {typeof thread.composer.isEditing === "boolean" ? (
            <span>Edit: {formatBoolean(thread.composer.isEditing)}</span>
          ) : null}
          {typeof thread.composer.canCancel === "boolean" ? (
            <span>Can Cancel: {formatBoolean(thread.composer.canCancel)}</span>
          ) : null}
          {typeof thread.composer.isEmpty === "boolean" ? (
            <span>Empty: {formatBoolean(thread.composer.isEmpty)}</span>
          ) : null}
        </div>
      </div>
    ) : null}
  </div>
);
