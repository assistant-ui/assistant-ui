import type { RemoteThreadInitializeResponse } from "./types";

export type RemoteThreadData =
  | {
      readonly id: string;
      readonly remoteId: undefined;
      readonly externalId: undefined;
      readonly status: "new";
      readonly title: undefined;
    }
  | {
      readonly id: string;
      readonly initializeTask: Promise<RemoteThreadInitializeResponse>;
      readonly remoteId: undefined;
      readonly externalId: undefined;
      readonly status: "regular" | "archived";
      readonly title?: string | undefined;
    }
  | {
      readonly id: string;
      readonly initializeTask: Promise<RemoteThreadInitializeResponse>;
      readonly remoteId: string;
      readonly externalId: string | undefined;
      readonly status: "regular" | "archived";
      readonly title?: string | undefined;
    };

export type THREAD_MAPPING_ID = string & { __brand: "THREAD_MAPPING_ID" };

export function createThreadMappingId(id: string): THREAD_MAPPING_ID {
  return id as THREAD_MAPPING_ID;
}

export type RemoteThreadState = {
  readonly isLoading: boolean;
  readonly newThreadId: string | undefined;
  readonly threadIds: readonly string[];
  readonly archivedThreadIds: readonly string[];
  readonly threadIdMap: Readonly<Record<string, THREAD_MAPPING_ID>>;
  readonly threadData: Readonly<Record<THREAD_MAPPING_ID, RemoteThreadData>>;
};

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
