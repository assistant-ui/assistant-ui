import { formatBoolean } from "../common";
import { MessageList } from "../message";
import { Chip, SectionLabel, SummaryItem } from "../ui";
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
    {title ? <SectionLabel>{title}</SectionLabel> : null}
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
      <div className="bg-card text-foreground rounded-md border p-3 text-[11px]">
        <SectionLabel>Capabilities</SectionLabel>
        <div className="mt-1 flex flex-wrap gap-1">
          {thread.capabilities.map((capability) => (
            <Chip key={capability}>{capability}</Chip>
          ))}
        </div>
      </div>
    ) : null}

    <MessageList messages={thread.messages} />

    {thread.suggestions.length ? (
      <div className="bg-card text-foreground rounded-md border border-dashed p-3 text-[11px]">
        <SectionLabel>Suggestions</SectionLabel>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {thread.suggestions.map((suggestion, index) => (
            <li key={index}>{suggestion.prompt || "(empty)"}</li>
          ))}
        </ul>
      </div>
    ) : null}

    {thread.composer ? (
      <div className="bg-card text-foreground flex flex-col gap-2 rounded-md border p-3 text-[11px]">
        <SectionLabel>Composer</SectionLabel>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryItem label="Role" value={thread.composer.role ?? "—"} />
          <SummaryItem
            label="Text length"
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
