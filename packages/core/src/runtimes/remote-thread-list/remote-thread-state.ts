import type {
  RemoteThreadInitializeResponse,
  RemoteThreadMetadata,
} from "./types";

export type RemoteThreadData =
  | {
      readonly id: string;
      readonly remoteId: undefined;
      readonly externalId: undefined;
      readonly status: "new";
      readonly title: undefined;
      readonly custom: undefined;
    }
  | {
      readonly id: string;
      readonly initializeTask: Promise<RemoteThreadInitializeResponse>;
      readonly remoteId: undefined;
      readonly externalId: undefined;
      readonly status: "regular" | "archived";
      readonly title?: string | undefined;
      readonly custom: undefined;
    }
  | {
      readonly id: string;
      readonly initializeTask: Promise<RemoteThreadInitializeResponse>;
      readonly remoteId: string;
      readonly externalId: string | undefined;
      readonly status: "regular" | "archived";
      readonly title?: string | undefined;
      readonly lastMessageAt?: Date | undefined;
      readonly custom?: Record<string, unknown> | undefined;
    };

export type THREAD_MAPPING_ID = string & { __brand: "THREAD_MAPPING_ID" };

export function createThreadMappingId(id: string): THREAD_MAPPING_ID {
  return id as THREAD_MAPPING_ID;
}

export const normalizeCursor = (c: string | undefined): string | undefined =>
  c || undefined;

type ClassifyAccumulator = {
  threadIds: string[];
  archivedThreadIds: string[];
  threadIdMap: Record<string, THREAD_MAPPING_ID>;
  threadData: Record<THREAD_MAPPING_ID, RemoteThreadData>;
};

export const classifyThreads = (
  threads: readonly RemoteThreadMetadata[],
  acc: ClassifyAccumulator,
): ClassifyAccumulator => {
  for (const thread of threads) {
    if (acc.threadIdMap[thread.remoteId] !== undefined) continue;

    switch (thread.status) {
      case "regular":
        acc.threadIds.push(thread.remoteId);
        break;
      case "archived":
        acc.archivedThreadIds.push(thread.remoteId);
        break;
      default: {
        const _exhaustiveCheck: never = thread.status;
        throw new Error(`Unsupported state: ${_exhaustiveCheck}`);
      }
    }

    const mappingId = createThreadMappingId(thread.remoteId);
    acc.threadIdMap[thread.remoteId] = mappingId;
    acc.threadData[mappingId] = {
      id: thread.remoteId,
      remoteId: thread.remoteId,
      externalId: thread.externalId,
      status: thread.status,
      title: thread.title,
      lastMessageAt: thread.lastMessageAt,
      custom: thread.custom,
      initializeTask: Promise.resolve({
        remoteId: thread.remoteId,
        externalId: thread.externalId,
      }),
    };
  }
  return acc;
};

export type RemoteThreadState = {
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly cursor: string | undefined;
  readonly newThreadId: string | undefined;
  readonly threadIds: readonly string[];
  readonly archivedThreadIds: readonly string[];
  readonly threadIdMap: Readonly<Record<string, THREAD_MAPPING_ID>>;
  readonly threadData: Readonly<Record<THREAD_MAPPING_ID, RemoteThreadData>>;
};

// A list() response predating a mid-flight local transition (a thread
// initialized while the request was running) omits that thread, and the
// completed-optimistic replay cannot re-add it because the merged threadData
// already carries the final status. Threads whose status moved from new (or
// nonexistent) at request time to regular/archived are re-inserted at the
// top, where updateStatusReducer would have placed them; threads the server
// already knew stay governed by the response, so a server-side deletion is
// not resurrected.
export const preserveMidLoadTransitions = (
  state: RemoteThreadState,
  statusAtRequest: ReadonlyMap<string, RemoteThreadData["status"]>,
): RemoteThreadState => {
  const regular = new Set(state.threadIds);
  const archived = new Set(state.archivedThreadIds);
  const prependRegular: string[] = [];
  const prependArchived: string[] = [];

  const contains = (ids: ReadonlySet<string>, data: RemoteThreadData) =>
    ids.has(data.id) || (data.remoteId !== undefined && ids.has(data.remoteId));

  for (const data of Object.values(state.threadData)) {
    const before = statusAtRequest.get(data.id);
    if (before !== undefined && before !== "new") continue;

    if (data.status === "regular" && !contains(regular, data)) {
      prependRegular.push(data.id);
      regular.add(data.id);
    } else if (data.status === "archived" && !contains(archived, data)) {
      prependArchived.push(data.id);
      archived.add(data.id);
    }
  }

  if (prependRegular.length === 0 && prependArchived.length === 0) return state;
  // Newest transition first, as successive updateStatusReducer prepends
  // would have left them.
  return {
    ...state,
    threadIds: [...prependRegular.reverse(), ...state.threadIds],
    archivedThreadIds: [
      ...prependArchived.reverse(),
      ...state.archivedThreadIds,
    ],
  };
};

export const statusSnapshot = (
  state: RemoteThreadState,
): ReadonlyMap<string, RemoteThreadData["status"]> =>
  new Map(Object.values(state.threadData).map((d) => [d.id, d.status]));

export const getThreadData = (
  state: RemoteThreadState,
  threadIdOrRemoteId: string,
) => {
  const idx = state.threadIdMap[threadIdOrRemoteId];
  if (idx === undefined) return undefined;
  return state.threadData[idx];
};

export const updateStatusReducer = (
  state: RemoteThreadState,
  threadIdOrRemoteId: string,
  newStatus: "regular" | "archived" | "deleted",
) => {
  const data = getThreadData(state, threadIdOrRemoteId);
  if (!data) return state;

  const { id, remoteId, status: lastStatus } = data;
  if (lastStatus === newStatus) return state;

  const newState = { ...state };

  // lastStatus
  switch (lastStatus) {
    case "new":
      newState.newThreadId = undefined;
      break;
    case "regular":
      newState.threadIds = newState.threadIds.filter((t) => t !== id);
      break;
    case "archived":
      newState.archivedThreadIds = newState.archivedThreadIds.filter(
        (t) => t !== id,
      );
      break;

    default: {
      const _exhaustiveCheck: never = lastStatus;
      throw new Error(`Unsupported state: ${_exhaustiveCheck}`);
    }
  }

  // newStatus
  switch (newStatus) {
    case "regular":
      newState.threadIds = [id, ...newState.threadIds];
      break;

    case "archived":
      newState.archivedThreadIds = [id, ...newState.archivedThreadIds];
      break;

    case "deleted":
      newState.threadData = Object.fromEntries(
        Object.entries(newState.threadData).filter(([key]) => key !== id),
      );
      newState.threadIdMap = Object.fromEntries(
        Object.entries(newState.threadIdMap).filter(
          ([key]) => key !== id && key !== remoteId,
        ),
      );
      break;

    default: {
      const _exhaustiveCheck: never = newStatus;
      throw new Error(`Unsupported state: ${_exhaustiveCheck}`);
    }
  }

  if (newStatus !== "deleted") {
    newState.threadData = {
      ...newState.threadData,
      [id]: {
        ...data,
        status: newStatus,
      },
    };
  }

  return newState;
};
