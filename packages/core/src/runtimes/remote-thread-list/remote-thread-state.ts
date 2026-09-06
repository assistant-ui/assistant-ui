import type {
  RemoteThreadInitializeResponse,
  RemoteThreadMetadata,
} from "./types";
import { generateId } from "../../utils/id";
import { nullProtoRecord } from "../../utils/record";

export type RemoteThreadData =
  | {
      readonly id: string;
      readonly remoteId: undefined;
      readonly externalId: undefined;
      readonly status: "new";
      readonly title: undefined;
      readonly custom: undefined;
      readonly localOrigin?: true;
    }
  | {
      readonly id: string;
      readonly initializeTask: Promise<RemoteThreadInitializeResponse>;
      readonly remoteId: undefined;
      readonly externalId: undefined;
      readonly status: "regular" | "archived";
      readonly title?: string | undefined;
      readonly custom: undefined;
      readonly localOrigin?: true;
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
      readonly localOrigin?: true;
    };

export type THREAD_MAPPING_ID = string & { __brand: "THREAD_MAPPING_ID" };

export function createThreadMappingId(id: string): THREAD_MAPPING_ID {
  return id as THREAD_MAPPING_ID;
}

export const LOCAL_THREAD_ID_PREFIX = "__LOCALID_";

export const normalizeCursor = (c: string | undefined): string | undefined =>
  c || undefined;

export type ClassifyAccumulator = {
  threadIds: string[];
  archivedThreadIds: string[];
  threadIdMap: Record<string, THREAD_MAPPING_ID>;
  threadData: Record<THREAD_MAPPING_ID, RemoteThreadData>;
};

// A slot's `id` is fixed when it is minted: the hook instance manager keys live
// thread runtimes by it, so renaming a slot would detach the runtime the user is
// chatting in. A listed thread whose `remoteId` already maps to a slot therefore
// refreshes that slot instead of minting a second one, and a slot minted by a
// list() that raced ahead of the remote id collapses when `initialize()` settles.
// `threadIds`/`archivedThreadIds` carry slot ids, never remote ids.
export const classifyThreads = (
  threads: readonly RemoteThreadMetadata[],
  acc: ClassifyAccumulator,
): ClassifyAccumulator => {
  let threadIds = [...acc.threadIds];
  let archivedThreadIds = [...acc.archivedThreadIds];
  const threadIdMap = nullProtoRecord(acc.threadIdMap);
  const threadData = nullProtoRecord(acc.threadData);
  const listed = new Set([...threadIds, ...archivedThreadIds]);

  for (const thread of threads) {
    switch (thread.status) {
      case "regular":
      case "archived":
        break;
      default: {
        const _exhaustiveCheck: never = thread.status;
        throw new Error(`Unsupported state: ${_exhaustiveCheck}`);
      }
    }

    const existingMappingId = threadIdMap[thread.remoteId];
    const existing =
      existingMappingId !== undefined
        ? threadData[existingMappingId]
        : undefined;
    const id = existing?.id ?? thread.remoteId;
    const mappingId = existingMappingId ?? createThreadMappingId(id);
    const existingTask =
      existing !== undefined && existing.status !== "new"
        ? existing.initializeTask
        : undefined;

    if (!listed.has(id)) {
      listed.add(id);
      if (thread.status === "regular") {
        threadIds.push(id);
      } else {
        archivedThreadIds.push(id);
      }
    } else if (existing !== undefined && existing.status !== thread.status) {
      if (thread.status === "regular") {
        archivedThreadIds = archivedThreadIds.filter((t) => t !== id);
        threadIds.push(id);
      } else {
        threadIds = threadIds.filter((t) => t !== id);
        archivedThreadIds.push(id);
      }
    }

    threadIdMap[id] = mappingId;
    threadIdMap[thread.remoteId] = mappingId;
    threadData[mappingId] = {
      ...(existing?.localOrigin === true ? { localOrigin: true as const } : {}),
      id,
      remoteId: thread.remoteId,
      externalId: thread.externalId,
      status: thread.status,
      title: thread.title,
      lastMessageAt: thread.lastMessageAt,
      custom: thread.custom,
      initializeTask:
        existingTask ??
        Promise.resolve({
          remoteId: thread.remoteId,
          externalId: thread.externalId,
        }),
    };
  }
  return { threadIds, archivedThreadIds, threadIdMap, threadData };
};

export type RemoteThreadState = {
  readonly isLoading: boolean;
  readonly loadError: unknown;
  readonly isLoadingMore: boolean;
  readonly cursor: string | undefined;
  readonly newThreadId: string | undefined;
  readonly threadIds: readonly string[];
  readonly archivedThreadIds: readonly string[];
  readonly threadIdMap: Readonly<Record<string, THREAD_MAPPING_ID>>;
  readonly threadData: Readonly<Record<THREAD_MAPPING_ID, RemoteThreadData>>;
};

export const createEmptyRemoteThreadState = (): RemoteThreadState => ({
  isLoading: true,
  loadError: undefined,
  isLoadingMore: false,
  cursor: undefined,
  newThreadId: undefined,
  threadIds: [],
  archivedThreadIds: [],
  threadIdMap: nullProtoRecord(),
  threadData: nullProtoRecord(),
});

export const seedNewThread = (
  state: RemoteThreadState,
): { id: string; state: RemoteThreadState } => {
  let id: string;
  do {
    id = `${LOCAL_THREAD_ID_PREFIX}${generateId()}`;
  } while (state.threadIdMap[id]);
  const mappingId = createThreadMappingId(id);
  return {
    id,
    state: {
      ...state,
      newThreadId: id,
      threadIdMap: nullProtoRecord(state.threadIdMap, {
        [id]: mappingId,
      }),
      threadData: nullProtoRecord(state.threadData, {
        [mappingId]: {
          status: "new",
          id,
          remoteId: undefined,
          externalId: undefined,
          title: undefined,
          custom: undefined,
          localOrigin: true,
        } satisfies RemoteThreadData,
      }),
    },
  };
};

// A list() response predating a mid-flight local transition (a thread
// initialized while the request was running) omits that thread, and the
// completed-optimistic replay cannot re-add it because the merged threadData
// already carries the final status. Threads whose status moved from new (or
// nonexistent) at request time to regular/archived are re-inserted at the
// top, in the order the pre-response lists carried them: updateStatusReducer
// prepends as transitions happen, so the pre-response lists hold newest
// first, which threadData insertion order need not match. Threads the server already knew stay governed by the response, so
// a server-side deletion is not resurrected — and a thread unknown to the
// snapshot is only rescued when it carries the localOrigin marker stamped at
// draft creation, so a deep-linked thread the fetch path deliberately
// appended at the tail is not hoisted, whatever its remote id looks like.
export const preserveMidLoadTransitions = (
  state: RemoteThreadState,
  priorOrder: Pick<RemoteThreadState, "threadIds" | "archivedThreadIds">,
  statusAtRequest: ReadonlyMap<string, RemoteThreadData["status"]>,
): RemoteThreadState => {
  const regular = new Set(state.threadIds);
  const archived = new Set(state.archivedThreadIds);
  const rescuedRegular: RemoteThreadData[] = [];
  const rescuedArchived: RemoteThreadData[] = [];

  const contains = (ids: ReadonlySet<string>, data: RemoteThreadData) =>
    ids.has(data.id) || (data.remoteId !== undefined && ids.has(data.remoteId));

  for (const data of Object.values(state.threadData)) {
    const before = statusAtRequest.get(data.id);
    if (before !== undefined && before !== "new") continue;
    if (before === undefined && data.localOrigin !== true) continue;

    if (data.status === "regular" && !contains(regular, data)) {
      rescuedRegular.push(data);
      regular.add(data.id);
    } else if (data.status === "archived" && !contains(archived, data)) {
      rescuedArchived.push(data);
      archived.add(data.id);
    }
  }

  if (rescuedRegular.length === 0 && rescuedArchived.length === 0) return state;

  const position = (ids: readonly string[], data: RemoteThreadData) => {
    const byId = ids.indexOf(data.id);
    if (byId !== -1) return byId;
    const byRemoteId =
      data.remoteId !== undefined ? ids.indexOf(data.remoteId) : -1;
    return byRemoteId !== -1 ? byRemoteId : Number.MAX_SAFE_INTEGER;
  };
  rescuedRegular.sort(
    (a, b) =>
      position(priorOrder.threadIds, a) - position(priorOrder.threadIds, b),
  );
  rescuedArchived.sort(
    (a, b) =>
      position(priorOrder.archivedThreadIds, a) -
      position(priorOrder.archivedThreadIds, b),
  );

  return {
    ...state,
    threadIds: [...rescuedRegular.map((d) => d.id), ...state.threadIds],
    archivedThreadIds: [
      ...rescuedArchived.map((d) => d.id),
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
  const idx = Object.hasOwn(state.threadIdMap, threadIdOrRemoteId)
    ? state.threadIdMap[threadIdOrRemoteId]
    : undefined;
  if (idx === undefined) return undefined;
  return Object.hasOwn(state.threadData, idx)
    ? state.threadData[idx]
    : undefined;
};

export const updateStatusReducer = (
  state: RemoteThreadState,
  threadIdOrRemoteId: string,
  newStatus: "regular" | "archived" | "deleted",
) => {
  const data = getThreadData(state, threadIdOrRemoteId);
  if (!data) return state;

  const { id, status: lastStatus } = data;
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

    case "deleted": {
      const mappingId = state.threadIdMap[threadIdOrRemoteId]!;
      const threadData = nullProtoRecord(newState.threadData);
      delete threadData[mappingId];
      newState.threadData = threadData;
      const threadIdMap = nullProtoRecord(newState.threadIdMap);
      for (const [key, value] of Object.entries(threadIdMap)) {
        if (value === mappingId) delete threadIdMap[key];
      }
      newState.threadIdMap = threadIdMap;
      break;
    }

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
