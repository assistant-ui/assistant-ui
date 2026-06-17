import { isRecord, truncate } from "../../utils/common";
import { McpView } from "../mcp";
import { ToolUIsView } from "../context";
import {
  ComposerAttachments,
  ComposerFlags,
  ComposerQueue,
  ThreadDetails,
  parseComposerPreview,
  parseThreadListItemPreview,
  parseThreadListPreview,
  parseThreadPreview,
} from "../thread";
import { InfoCard, JSONTree, SummaryItem, SummaryList } from "../ui";

const renderToolUIsStatePreview = (value: unknown) => (
  <ToolUIsView value={value} />
);

const renderThreadsStatePreview = (value: unknown) => {
  const state = parseThreadListPreview(value);
  if (!state) {
    return <JSONTree value={value} />;
  }

  const threadItems = state.threadItems.slice(0, 8);
  const main = state.main;

  return (
    <div className="flex flex-col gap-6">
      <InfoCard title="Threads">
        <SummaryList>
          <SummaryItem label="Main thread" value={state.mainThreadId ?? "—"} />
          <SummaryItem label="New thread" value={state.newThreadId ?? "—"} />
          <SummaryItem label="Active" value={String(state.threadIds.length)} />
          <SummaryItem
            label="Archived"
            value={String(state.archivedThreadIds.length)}
          />
        </SummaryList>
      </InfoCard>

      {threadItems.length ? (
        <InfoCard title="Thread items" count={state.threadItems.length}>
          <table className="w-full table-fixed text-left">
            <thead className="text-muted-foreground text-[11px]">
              <tr className="border-border border-b">
                <th className="py-1.5 pr-3 font-medium">Title</th>
                <th className="py-1.5 pr-3 font-medium">Status</th>
                <th className="py-1.5 font-medium">Identifiers</th>
              </tr>
            </thead>
            <tbody className="text-foreground text-[12px]">
              {threadItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-border/70 border-b last:border-b-0"
                >
                  <td className="py-2 pr-3 align-top">
                    <div className="text-foreground truncate font-medium">
                      {item.title || "(untitled)"}
                    </div>
                    <div className="text-muted-foreground truncate font-mono text-[11px]">
                      {item.id}
                    </div>
                  </td>
                  <td className="text-muted-foreground py-2 pr-3 align-top">
                    {item.status ?? "—"}
                  </td>
                  <td className="text-muted-foreground py-2 align-top font-mono text-[11px]">
                    {item.remoteId ? `Remote: ${item.remoteId}` : null}
                    {item.remoteId && item.externalId ? <br /> : null}
                    {item.externalId ? `External: ${item.externalId}` : null}
                    {!item.remoteId && !item.externalId ? "—" : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {state.threadItems.length > threadItems.length ? (
            <div className="text-muted-foreground text-[11px]">
              Showing first {threadItems.length}
            </div>
          ) : null}
        </InfoCard>
      ) : null}

      {main ? <ThreadDetails thread={main} title="Main thread" /> : null}
    </div>
  );
};

const renderThreadStatePreview = (value: unknown) => {
  const thread = parseThreadPreview(value);
  if (!thread) {
    return <JSONTree value={value} />;
  }
  return <ThreadDetails thread={thread} title="Thread" />;
};

const renderThreadListItemStatePreview = (value: unknown) => {
  const item = parseThreadListItemPreview(value);
  if (!item) {
    return <JSONTree value={value} />;
  }

  return (
    <SummaryList>
      <SummaryItem label="ID" value={item.id} />
      <SummaryItem label="Title" value={item.title ?? "(untitled)"} />
      <SummaryItem label="Status" value={item.status ?? "—"} />
      <SummaryItem label="Remote ID" value={item.remoteId ?? "—"} />
      <SummaryItem label="External ID" value={item.externalId ?? "—"} />
    </SummaryList>
  );
};

const renderComposerStatePreview = (value: unknown) => {
  const composer = parseComposerPreview(value);
  if (!composer || !isRecord(value)) {
    return <JSONTree value={value} />;
  }

  const text = typeof value.text === "string" ? value.text : "";
  const runConfig = value.runConfig;

  return (
    <div className="flex flex-col gap-6">
      <InfoCard title="Composer">
        <SummaryList>
          <SummaryItem label="Role" value={composer.role ?? "—"} />
          <SummaryItem
            label="Text length"
            value={String(composer.textLength)}
          />
          <SummaryItem
            label="Attachments"
            value={String(composer.attachments.length)}
          />
          <SummaryItem label="Mode" value={composer.type ?? "—"} />
        </SummaryList>
        <ComposerFlags composer={composer} />
        <ComposerAttachments attachments={composer.attachments} />
        <ComposerQueue queue={composer.queue} />
      </InfoCard>

      {text ? (
        <InfoCard title="Text preview">
          <p className="text-foreground text-[12px] wrap-break-word whitespace-pre-wrap">
            {truncate(text, 240)}
          </p>
        </InfoCard>
      ) : null}

      {runConfig !== undefined ? (
        <InfoCard title="Run config">
          <JSONTree value={runConfig} />
        </InfoCard>
      ) : null}
    </div>
  );
};

export const renderStatePreview = (key: string, value: unknown) => {
  switch (key) {
    case "threads":
      return renderThreadsStatePreview(value);
    case "threadListItems":
      return renderThreadsStatePreview({
        threadItems: value,
        threadIds: [],
        archivedThreadIds: [],
      });
    case "thread":
      return renderThreadStatePreview(value);
    case "threadListItem":
    case "threadlistitem":
      return renderThreadListItemStatePreview(value);
    case "tools":
      return renderToolUIsStatePreview(value);
    case "composer":
      return renderComposerStatePreview(value);
    case "mcp":
      return <McpView value={value} />;
    default:
      return <JSONTree value={value} />;
  }
};
