import type {
  RemoteThreadInitializeResponse,
  RemoteThreadMetadata,
} from "./types";
import { generateId } from "../../utils/id";

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

type ClassifyAccumulator = {
  threadIds: string[];
  archivedThreadIds: string[];
  threadIdMap: Record<string, THREAD_MAPPING_ID>;
  threadData: Record<THREAD_MAPPING_ID, RemoteThreadData>;
};

type MergeThreadDataOptions = {
  updateLists?: boolean;
  preferredMappingId?: THREAD_MAPPING_ID;
};

const mergeThreadData = (
  acc: ClassifyAccumulator,
  incoming: RemoteThreadData,
  options: MergeThreadDataOptions = {},
): THREAD_MAPPING_ID => {
  const remoteId = incoming.remoteId;
  const mappedId =
    remoteId === undefined ? undefined : acc.threadIdMap[remoteId];
  const matchingEntries =
    remoteId === undefined
      ? []
      : Object.entries(acc.threadData).filter(
          ([, data]) => data.remoteId === remoteId,
        );
  const localEntry = matchingEntries.find(([, data]) => data.localOrigin);
  const incomingMappingId =
    incoming.localOrigin === true
      ? createThreadMappingId(incoming.id)
      : undefined;
  const mappingId: THREAD_MAPPING_ID =
    options.preferredMappingId ??
    incomingMappingId ??
    (localEntry?.[0] as THREAD_MAPPING_ID | undefined) ??
    (mappedId !== undefined && acc.threadData[mappedId]
      ? mappedId
      : ((matchingEntries[0]?.[0] as THREAD_MAPPING_ID | undefined) ??
        createThreadMappingId(incoming.id)));
  const current = acc.threadData[mappingId];
  const references = new Set<string>([incoming.id, mappingId]);
  if (remoteId !== undefined) references.add(remoteId);
  if (current !== undefined) references.add(current.id);
  for (const [, data] of matchingEntries) {
    references.add(data.id);
  }

  let targetIndex = -1;
  if (
    options.updateLists !== false &&
    remoteId !== undefined &&
    (incoming.status === "regular" || incoming.status === "archived")
  ) {
    const target =
      incoming.status === "regular" ? acc.threadIds : acc.archivedThreadIds;
    targetIndex = target.findIndex((id) => references.has(id));
  }

  const duplicateMappingIds = new Set(
    matchingEntries
      .map(([key]) => key as THREAD_MAPPING_ID)
      .filter((key) => key !== mappingId),
  );
  for (const key of duplicateMappingIds) {
    delete acc.threadData[key];
  }
  for (const [key, value] of Object.entries(acc.threadIdMap)) {
    if (duplicateMappingIds.has(value) || references.has(key)) {
      acc.threadIdMap[key] = mappingId;
    }
  }

  const existing = current ?? matchingEntries[0]?.[1];
  const data =
    existing !== undefined && incoming.remoteId !== undefined
      ? ({
          ...existing,
          ...incoming,
          id: incoming.localOrigin === true ? incoming.id : existing.id,
        } as RemoteThreadData)
      : incoming;
  acc.threadData[mappingId] = data;
  acc.threadIdMap[data.id] = mappingId;
  if (remoteId !== undefined) acc.threadIdMap[remoteId] = mappingId;

  if (options.updateLists !== false) {
    acc.threadIds = acc.threadIds.filter((id) => !references.has(id));
    acc.archivedThreadIds = acc.archivedThreadIds.filter(
      (id) => !references.has(id),
    );

    if (data.status === "regular" || data.status === "archived") {
      const target =
        data.status === "regular" ? acc.threadIds : acc.archivedThreadIds;
      target.splice(
        targetIndex === -1
          ? target.length
          : Math.min(targetIndex, target.length),
        0,
        data.id,
      );
    }
  } else {
    const regularIndex = acc.threadIds.findIndex((id) => references.has(id));
    const archivedIndex = acc.archivedThreadIds.findIndex((id) =>
      references.has(id),
    );
    acc.threadIds = acc.threadIds.filter((id) => !references.has(id));
    acc.archivedThreadIds = acc.archivedThreadIds.filter(
      (id) => !references.has(id),
    );
    if (regularIndex !== -1) {
      acc.threadIds.splice(
        Math.min(regularIndex, acc.threadIds.length),
        0,
        data.id,
      );
    }
    if (archivedIndex !== -1) {
      acc.archivedThreadIds.splice(
        Math.min(archivedIndex, acc.archivedThreadIds.length),
        0,
        data.id,
      );
    }
  }

  return mappingId;
};

export const mergeRemoteThreadData = mergeThreadData;

export const classifyThreads = (
  threads: readonly RemoteThreadMetadata[],
  acc: ClassifyAccumulator,
): ClassifyAccumulator => {
  for (const thread of threads) {
    switch (thread.status) {
      case "regular":
        break;
      case "archived":
        break;
      default: {
        const _exhaustiveCheck: never = thread.status;
        throw new Error(`Unsupported state: ${_exhaustiveCheck}`);
      }
    }

    mergeThreadData(acc, {
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
    });
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

export const createEmptyRemoteThreadState = (): RemoteThreadState => ({
  isLoading: true,
  isLoadingMore: false,
  cursor: undefined,
  newThreadId: undefined,
  threadIds: [],
  archivedThreadIds: [],
  threadIdMap: {},
  threadData: {},
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
      threadIdMap: {
        ...state.threadIdMap,
        [id]: mappingId,
      },
      threadData: {
        ...state.threadData,
        [mappingId]: {
          status: "new",
          id,
          remoteId: undefined,
          externalId: undefined,
          title: undefined,
          custom: undefined,
          localOrigin: true,
        } satisfies RemoteThreadData,
      },
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

    case "deleted": {
      const removedMappingIds = new Set(
        Object.entries(newState.threadData)
          .filter(([, item]) =>
            remoteId === undefined
              ? item.id === id
              : item.remoteId === remoteId,
          )
          .map(([key]) => key),
      );
      const removedReferences = new Set<string>([id]);
      if (remoteId !== undefined) removedReferences.add(remoteId);
      for (const key of removedMappingIds) {
        const item = newState.threadData[key as THREAD_MAPPING_ID];
        if (item !== undefined) removedReferences.add(item.id);
      }

      newState.threadData = Object.fromEntries(
        Object.entries(newState.threadData).filter(
          ([key]) => !removedMappingIds.has(key),
        ),
      );
      newState.threadIdMap = Object.fromEntries(
        Object.entries(newState.threadIdMap).filter(
          ([key, mappingId]) =>
            !removedMappingIds.has(mappingId) && !removedReferences.has(key),
        ),
      );
      newState.threadIds = newState.threadIds.filter(
        (threadId) => !removedReferences.has(threadId),
      );
      newState.archivedThreadIds = newState.archivedThreadIds.filter(
        (threadId) => !removedReferences.has(threadId),
      );
      if (
        newState.newThreadId !== undefined &&
        removedReferences.has(newState.newThreadId)
      ) {
        newState.newThreadId = undefined;
      }
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
