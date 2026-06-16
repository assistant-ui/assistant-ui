import { isRecord, truncate } from "../views/common";
import { McpView } from "../views/mcp";
import {
  ComposerAttachments,
  ComposerFlags,
  ComposerQueue,
  ThreadDetails,
  parseComposerPreview,
  parseThreadListItemPreview,
  parseThreadListPreview,
  parseThreadPreview,
} from "../views/thread";
import { Chip, JSONPreview, SectionLabel, SummaryItem } from "../views/ui";

export const renderToolUIsStatePreview = (value: unknown) => {
  if (!isRecord(value)) {
    return <JSONPreview value={value} />;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return (
      <div className="text-muted-foreground text-[11px]">
        no tool UI mappings
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map(([toolName, components]) => {
        const list = Array.isArray(components) ? components : [];
        const firstEntry = typeof list[0] === "string" ? list[0] : undefined;

        return (
          <div
            key={toolName}
            className="bg-muted/40 text-foreground rounded-md border p-3 text-[11px] transition-colors"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-foreground font-medium">{toolName}</span>
              <Chip>
                {list.length} component{list.length === 1 ? "" : "s"}
              </Chip>
            </div>
            {firstEntry ? (
              <div className="text-muted-foreground mt-1 text-[10px]">
                First entry: {truncate(firstEntry, 80)}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

const renderThreadsStatePreview = (value: unknown) => {
  const state = parseThreadListPreview(value);
  if (!state) {
    return <JSONPreview value={value} />;
  }

  const activeCount = state.threadIds.length;
  const archivedCount = state.archivedThreadIds.length;
  const threadItems = state.threadItems.slice(0, 8);
  const main = state.main;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryItem label="Main thread" value={state.mainThreadId ?? "—"} />
        <SummaryItem label="New thread" value={state.newThreadId ?? "—"} />
        <SummaryItem label="Active threads" value={String(activeCount)} />
        <SummaryItem label="Archived threads" value={String(archivedCount)} />
      </div>

      {threadItems.length ? (
        <div className="flex flex-col gap-2">
          <SectionLabel>Thread items ({state.threadItems.length})</SectionLabel>
          <div className="bg-card overflow-hidden rounded-lg border">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="bg-muted text-muted-foreground text-[10px]">
                <tr>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Identifiers</th>
                </tr>
              </thead>
              <tbody className="text-foreground text-[11px]">
                {threadItems.map((item) => (
                  <tr key={item.id} className="bg-card border-t">
                    <td className="px-3 py-2 align-top">
                      <div className="text-foreground font-medium">
                        {item.title || "(untitled)"}
                      </div>
                      <div className="text-muted-foreground font-mono text-[10px]">
                        {item.id}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {item.status ?? "—"}
                    </td>
                    <td className="text-muted-foreground px-3 py-2 align-top font-mono text-[10px]">
                      {item.remoteId ? `Remote: ${item.remoteId}` : null}
                      {item.remoteId && item.externalId ? <br /> : null}
                      {item.externalId ? `External: ${item.externalId}` : null}
                      {!item.remoteId && !item.externalId ? "—" : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {state.threadItems.length > threadItems.length ? (
            <div className="text-muted-foreground text-[10px]">
              Showing first {threadItems.length} items
            </div>
          ) : null}
        </div>
      ) : null}

      {main ? (
        <ThreadDetails thread={main} title="Main thread overview" />
      ) : null}
    </div>
  );
};

const renderThreadStatePreview = (value: unknown) => {
  const thread = parseThreadPreview(value);
  if (!thread) {
    return <JSONPreview value={value} />;
  }
  return <ThreadDetails thread={thread} title="Thread overview" />;
};

const renderThreadListItemStatePreview = (value: unknown) => {
  const item = parseThreadListItemPreview(value);
  if (!item) {
    return <JSONPreview value={value} />;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryItem label="ID" value={item.id} />
      <SummaryItem label="Title" value={item.title ?? "(untitled)"} />
      <SummaryItem label="Status" value={item.status ?? "—"} />
      <SummaryItem label="Remote ID" value={item.remoteId ?? "—"} />
      <SummaryItem label="External ID" value={item.externalId ?? "—"} />
    </div>
  );
};

const renderComposerStatePreview = (value: unknown) => {
  const composer = parseComposerPreview(value);
  if (!composer || !isRecord(value)) {
    return <JSONPreview value={value} />;
  }

  const text = typeof value.text === "string" ? value.text : "";
  const runConfig = value.runConfig;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryItem label="Role" value={composer.role ?? "—"} />
        <SummaryItem label="Text length" value={String(composer.textLength)} />
        <SummaryItem
          label="Attachments"
          value={String(composer.attachments.length)}
        />
        <SummaryItem label="Mode" value={composer.type ?? "—"} />
      </div>
      <ComposerFlags composer={composer} />
      <ComposerAttachments attachments={composer.attachments} />
      {text ? (
        <div className="bg-card text-foreground flex flex-col gap-1 rounded-md border p-3 text-[11px]">
          <SectionLabel>Text preview</SectionLabel>
          <div className="text-foreground wrap-break-word whitespace-pre-wrap">
            {truncate(text, 240)}
          </div>
        </div>
      ) : null}
      {runConfig !== undefined ? (
        <div className="bg-card text-foreground flex flex-col gap-1 rounded-md border p-3 text-[11px]">
          <SectionLabel>Run config</SectionLabel>
          <JSONPreview value={runConfig} />
        </div>
      ) : null}
      <ComposerQueue queue={composer.queue} />
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
      return <JSONPreview value={value} />;
  }
};
