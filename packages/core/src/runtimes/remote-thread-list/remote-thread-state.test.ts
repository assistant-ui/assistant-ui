import { describe, expect, it } from "vitest";
import {
  classifyThreads,
  createEmptyRemoteThreadState,
  createThreadMappingId,
  seedNewThread,
  updateStatusReducer,
} from "./remote-thread-state";
import type {
  RemoteThreadData,
  RemoteThreadState,
} from "./remote-thread-state";

const initializedDraft = () => {
  const seeded = seedNewThread(createEmptyRemoteThreadState());
  const regular = updateStatusReducer(seeded.state, seeded.id, "regular");
  const mappingId = regular.threadIdMap[seeded.id]!;
  const initializeTask = Promise.resolve({
    remoteId: "remote-1",
    externalId: "remote-1",
  });
  return {
    id: seeded.id,
    mappingId,
    initializeTask,
    state: {
      ...regular,
      threadIdMap: { ...regular.threadIdMap, "remote-1": mappingId },
      threadData: {
        ...regular.threadData,
        [mappingId]: {
          ...regular.threadData[mappingId]!,
          remoteId: "remote-1",
          externalId: "remote-1",
          initializeTask,
        } as RemoteThreadData,
      },
    } as RemoteThreadState,
  };
};

const expectOneSlotPerIdentity = (state: RemoteThreadState) => {
  const remoteIds = Object.values(state.threadData)
    .map((data) => data.remoteId)
    .filter((remoteId) => remoteId !== undefined);
  expect(new Set(remoteIds).size).toBe(remoteIds.length);

  for (const id of [...state.threadIds, ...state.archivedThreadIds]) {
    expect(state.threadData[state.threadIdMap[id]!]?.id).toBe(id);
  }
};

describe("remote thread state", () => {
  it("creates an empty state", () => {
    expect(createEmptyRemoteThreadState()).toEqual({
      isLoading: true,
      loadError: undefined,
      isLoadingMore: false,
      cursor: undefined,
      newThreadId: undefined,
      threadIds: [],
      archivedThreadIds: [],
      threadIdMap: {},
      threadData: {},
    });
  });

  it("seeds unique local threads with matching mapping ids", () => {
    const first = seedNewThread(createEmptyRemoteThreadState());
    const second = seedNewThread(first.state);

    expect(second.id).not.toBe(first.id);
    expect(first.state.newThreadId).toBe(first.id);
    expect(second.state.newThreadId).toBe(second.id);
    expect(first.state.threadIdMap[first.id]).toBe(
      createThreadMappingId(first.id),
    );
    expect(second.state.threadIdMap[second.id]).toBe(
      createThreadMappingId(second.id),
    );
    expect(Object.keys(second.state.threadData)).toEqual([first.id, second.id]);
  });

  it("refreshes the local slot when a listed thread already has a mapping", () => {
    const draft = initializedDraft();

    const merged = classifyThreads(
      [
        {
          status: "regular",
          remoteId: "remote-1",
          externalId: "remote-1",
          title: "from the server",
        },
      ],
      {
        threadIds: [],
        archivedThreadIds: [],
        threadIdMap: { ...draft.state.threadIdMap },
        threadData: { ...draft.state.threadData },
      },
    );

    expect(Object.keys(merged.threadData)).toEqual([draft.mappingId]);
    expect(merged.threadIds).toEqual([draft.id]);
    expect(merged.threadIdMap["remote-1"]).toBe(draft.mappingId);
    expect(merged.threadData[draft.mappingId]?.id).toBe(draft.id);
    expect(merged.threadData[draft.mappingId]?.title).toBe("from the server");
    expect(merged.threadData[draft.mappingId]?.localOrigin).toBe(true);
    const refreshed = merged.threadData[draft.mappingId]!;
    expect(
      refreshed.status === "new" ? undefined : refreshed.initializeTask,
    ).toBe(draft.initializeTask);
    expectOneSlotPerIdentity({ ...draft.state, ...merged });
  });

  it("lists a repeated remote id once", () => {
    const listed = classifyThreads(
      [
        { status: "regular", remoteId: "a", externalId: "a", title: "first" },
        { status: "regular", remoteId: "a", externalId: "a", title: "second" },
      ],
      {
        threadIds: [],
        archivedThreadIds: [],
        threadIdMap: {},
        threadData: {},
      },
    );

    expect(listed.threadIds).toEqual(["a"]);
    expect(listed.threadData[createThreadMappingId("a")]?.title).toBe("second");
  });

  it.each(["__proto__", "constructor", "toString"])(
    "handles a prototype-named remote id %s",
    (remoteId) => {
      const classified = classifyThreads(
        [
          {
            status: "regular",
            remoteId,
            externalId: undefined,
            title: `title-${remoteId}`,
          },
          {
            status: "regular",
            remoteId: "ok",
            externalId: undefined,
            title: "title-ok",
          },
        ],
        {
          threadIds: [],
          archivedThreadIds: [],
          threadIdMap: {},
          threadData: {},
        },
      );
      const listed: RemoteThreadState = {
        ...createEmptyRemoteThreadState(),
        threadIds: classified.threadIds,
        archivedThreadIds: classified.archivedThreadIds,
        threadIdMap: classified.threadIdMap,
        threadData: classified.threadData,
      };

      expect(Object.keys(listed.threadIdMap)).toEqual([remoteId, "ok"]);
      expect(typeof listed.threadIdMap[remoteId]).toBe("string");
      expect(Object.keys(listed.threadData)).toEqual([remoteId, "ok"]);

      const deleted = updateStatusReducer(listed, remoteId, "deleted");
      expect(Object.keys(deleted.threadIdMap)).toEqual(["ok"]);
      expect(Object.keys(deleted.threadData)).toEqual(["ok"]);
      expect(deleted.threadIds).toEqual(["ok"]);
    },
  );

  it("deletes every alias of an identity, by either id", () => {
    for (const target of ["remote-1", "local"] as const) {
      const draft = initializedDraft();
      const deleted = updateStatusReducer(
        draft.state,
        target === "local" ? draft.id : target,
        "deleted",
      );

      expect(deleted.threadData).toEqual({});
      expect(deleted.threadIdMap).toEqual({});
      expect(deleted.threadIds).toEqual([]);
      expect(deleted.archivedThreadIds).toEqual([]);
    }
  });
});
