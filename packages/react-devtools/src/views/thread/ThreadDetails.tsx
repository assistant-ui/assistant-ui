import { formatBoolean } from "../../utils/common";
import { MessageList } from "../message";
import { Chip, InfoCard, SummaryItem, SummaryList } from "../ui";
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
  <div className="flex flex-col gap-6">
    <InfoCard title={title ?? "Thread"}>
      <SummaryList>
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
      </SummaryList>
    </InfoCard>

    {thread.capabilities.length ? (
      <InfoCard title="Capabilities" count={thread.capabilities.length}>
        <div className="flex flex-wrap gap-1.5">
          {thread.capabilities.map((capability) => (
            <Chip key={capability}>{capability}</Chip>
          ))}
        </div>
      </InfoCard>
    ) : null}

    <MessageList messages={thread.messages} />

    {thread.suggestions.length ? (
      <InfoCard title="Suggestions" count={thread.suggestions.length}>
        <ul className="text-foreground list-disc space-y-1 pl-4 text-[12px]">
          {thread.suggestions.map((suggestion, index) => (
            <li key={index}>{suggestion.prompt || "(empty)"}</li>
          ))}
        </ul>
      </InfoCard>
    ) : null}

    {thread.composer ? (
      <InfoCard title="Composer">
        <SummaryList>
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
        </SummaryList>
        <ComposerFlags composer={thread.composer} />
        <ComposerAttachments attachments={thread.composer.attachments} />
        <ComposerQueue queue={thread.composer.queue} />
      </InfoCard>
    ) : null}
  </div>
);
