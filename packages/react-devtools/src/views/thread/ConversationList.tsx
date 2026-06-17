import { truncate } from "../../utils/common";
import { PaneHeader, RailTime, SelectableRow } from "../ui";
import { ConversationStatusDot } from "./ConversationStatusDot";
import type { ThreadListItemPreview, ThreadListPreview } from "./types";
import { parseThreadPreview } from "./utils";

const lastMessageAt = (
  snapshots: Readonly<Record<string, unknown>> | undefined,
  threadId: string,
  fallback?: string,
) => {
  if (fallback) return fallback;
  const raw = snapshots?.[threadId];
  const thread = raw ? parseThreadPreview(raw) : null;
  return thread?.messages.at(-1)?.createdAt;
};

export const conversationListHeader = (threadList: ThreadListPreview) => {
  const regular = threadList.threadIds.length;
  const archived = threadList.archivedThreadIds.length;

  return (
    <PaneHeader>
      {regular} conversation{regular === 1 ? "" : "s"}
      {archived ? ` · ${archived} archived` : null}
    </PaneHeader>
  );
};

const ROW = "flex h-8 items-center gap-1.5";

const ConversationRow = ({
  item,
  selected,
  mainThreadId,
  main,
  snapshots,
  onSelect,
}: {
  item: ThreadListItemPreview;
  selected: boolean;
  mainThreadId: string | undefined;
  main: ThreadListPreview["main"];
  snapshots: Readonly<Record<string, unknown>> | undefined;
  onSelect: () => void;
}) => {
  const title = item.title?.trim() || "(untitled)";
  const whenSource = lastMessageAt(snapshots, item.id, item.lastMessageAt);

  return (
    <SelectableRow selected={selected} onSelect={onSelect} dense>
      <div className={ROW} title={title}>
        <ConversationStatusDot
          item={item}
          mainThreadId={mainThreadId}
          main={main}
          snapshots={snapshots}
        />
        <span className="text-foreground min-w-0 flex-1 truncate text-[12px] font-medium">
          {truncate(title, 64)}
        </span>
        {whenSource ? <RailTime value={whenSource} /> : null}
      </div>
    </SelectableRow>
  );
};

export const ConversationList = ({
  threadList,
  snapshots,
  selectedId,
  onSelect,
}: {
  threadList: ThreadListPreview;
  snapshots: Readonly<Record<string, unknown>> | undefined;
  selectedId: string;
  onSelect: (threadId: string) => void;
}) => {
  const itemsById = new Map(
    threadList.threadItems.map((item) => [item.id, item]),
  );

  const regular = threadList.threadIds
    .map((id) => itemsById.get(id))
    .filter((item): item is ThreadListItemPreview => Boolean(item));

  const archived = threadList.archivedThreadIds
    .map((id) => itemsById.get(id))
    .filter((item): item is ThreadListItemPreview => Boolean(item));

  const mainThreadId = threadList.mainThreadId;
  const main = threadList.main;

  return (
    <>
      {regular.map((item) => (
        <ConversationRow
          key={item.id}
          item={item}
          selected={selectedId === item.id}
          mainThreadId={mainThreadId}
          main={main}
          snapshots={snapshots}
          onSelect={() => onSelect(item.id)}
        />
      ))}
      {archived.length ? (
        <div className="border-border border-t">
          <div className="text-muted-foreground px-3 py-1 text-[9px] font-medium tracking-wide uppercase">
            Archived
          </div>
          {archived.map((item) => (
            <ConversationRow
              key={item.id}
              item={item}
              selected={selectedId === item.id}
              mainThreadId={mainThreadId}
              main={main}
              snapshots={snapshots}
              onSelect={() => onSelect(item.id)}
            />
          ))}
        </div>
      ) : null}
    </>
  );
};
