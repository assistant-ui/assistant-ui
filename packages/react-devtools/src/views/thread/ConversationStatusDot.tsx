import clsx from "clsx";
import type { ThreadListItemPreview, ThreadPreview } from "./types";
import { parseThreadPreview } from "./utils";

export type ConversationDotState =
  | "unloaded"
  | "loading"
  | "loaded"
  | "running"
  | "active"
  | "active-running"
  | "error"
  | "new";

const DOT_CLASS: Record<ConversationDotState, string> = {
  unloaded: "bg-muted-foreground/30",
  loading: "bg-muted-foreground/45",
  loaded: "bg-blue-500",
  running: "bg-blue-500",
  active: "bg-emerald-500",
  "active-running": "bg-emerald-500",
  error: "bg-red-500",
  new: "bg-violet-500",
};

const DOT_LABEL: Record<ConversationDotState, string> = {
  unloaded: "Not loaded in DevTools",
  loading: "Loading",
  loaded: "Loaded",
  running: "Running",
  active: "Active in app",
  "active-running": "Active · running",
  error: "Error",
  new: "New conversation",
};

const threadHasError = (thread: ThreadPreview | null | undefined) =>
  Boolean(
    thread?.messages.some((message) => message.status?.type === "incomplete"),
  );

const threadForItem = (
  item: ThreadListItemPreview,
  mainThreadId: string | undefined,
  main: ThreadPreview | undefined,
  snapshots: Readonly<Record<string, unknown>> | undefined,
): ThreadPreview | null => {
  if (item.id === mainThreadId && main) return main;
  const raw = snapshots?.[item.id];
  return raw ? parseThreadPreview(raw) : null;
};

const isLoadedInDevtools = (
  item: ThreadListItemPreview,
  mainThreadId: string | undefined,
  main: ThreadPreview | undefined,
  snapshots: Readonly<Record<string, unknown>> | undefined,
) =>
  snapshots?.[item.id] !== undefined ||
  (item.id === mainThreadId && main !== undefined);

export const resolveConversationDotState = ({
  item,
  mainThreadId,
  main,
  snapshots,
}: {
  item: ThreadListItemPreview;
  mainThreadId: string | undefined;
  main: ThreadPreview | undefined;
  snapshots: Readonly<Record<string, unknown>> | undefined;
}): ConversationDotState => {
  const isActive = item.id === mainThreadId;
  const loaded = isLoadedInDevtools(item, mainThreadId, main, snapshots);
  const thread = threadForItem(item, mainThreadId, main, snapshots);

  if (item.status === "new") return "new";

  if (!loaded) return "unloaded";

  if (threadHasError(thread)) return "error";

  if (isActive) {
    return thread?.isRunning ? "active-running" : "active";
  }

  if (thread?.isRunning) return "running";
  if (thread?.isLoading) return "loading";

  return "loaded";
};

export const ConversationStatusDot = ({
  item,
  mainThreadId,
  main,
  snapshots,
}: {
  item: ThreadListItemPreview;
  mainThreadId: string | undefined;
  main: ThreadPreview | undefined;
  snapshots: Readonly<Record<string, unknown>> | undefined;
}) => {
  const state = resolveConversationDotState({
    item,
    mainThreadId,
    main,
    snapshots,
  });
  const label = DOT_LABEL[state];
  const pulse =
    state === "loading" || state === "running" || state === "active-running";

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={clsx(
        "size-1.5 shrink-0 rounded-full",
        DOT_CLASS[state],
        pulse && "animate-pulse",
      )}
    />
  );
};
