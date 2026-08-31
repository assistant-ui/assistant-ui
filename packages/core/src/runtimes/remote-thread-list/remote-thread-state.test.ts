import { describe, expect, it } from "vitest";
import {
  classifyThreads,
  createEmptyRemoteThreadState,
  createThreadMappingId,
  seedNewThread,
  updateStatusReducer,
} from "./remote-thread-state";

describe("remote thread state", () => {
  it("creates an empty state", () => {
    expect(createEmptyRemoteThreadState()).toEqual({
      isLoading: true,
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

  it("keeps one mapping for an initialized local thread and deletes all aliases", () => {
    const seeded = seedNewThread(createEmptyRemoteThreadState());
    const regular = updateStatusReducer(seeded.state, seeded.id, "regular");
    const localMappingId = regular.threadIdMap[seeded.id]!;
    const initialized = {
      ...regular,
      threadIdMap: {
        ...regular.threadIdMap,
        "remote-1": localMappingId,
      },
      threadData: {
        ...regular.threadData,
        [localMappingId]: {
          ...regular.threadData[localMappingId]!,
          remoteId: "remote-1",
          externalId: "remote-1",
          initializeTask: Promise.resolve({
            remoteId: "remote-1",
            externalId: "remote-1",
          }),
        },
      },
    };
    const fresh = classifyThreads(
      [
        {
          status: "regular",
          remoteId: "remote-1",
          externalId: "remote-1",
        },
      ],
      {
        threadIds: [],
        archivedThreadIds: [],
        threadIdMap: {},
        threadData: {},
      },
    );
    const duplicate = {
      ...initialized,
      threadIds: [seeded.id, "remote-1"],
      threadIdMap: { ...initialized.threadIdMap, ...fresh.threadIdMap },
      threadData: { ...initialized.threadData, ...fresh.threadData },
    };

    const reconciled = classifyThreads(
      [
        {
          status: "regular",
          remoteId: "remote-1",
          externalId: "remote-1",
        },
      ],
      {
        threadIds: [],
        archivedThreadIds: [],
        threadIdMap: { ...duplicate.threadIdMap },
        threadData: { ...duplicate.threadData },
      },
    );

    expect(Object.keys(reconciled.threadData)).toEqual([seeded.id]);
    expect(reconciled.threadIdMap["remote-1"]).toBe(localMappingId);
    expect(reconciled.threadIds).toEqual([seeded.id]);

    const deleted = updateStatusReducer(duplicate, "remote-1", "deleted");
    expect(deleted.threadData).toEqual({});
    expect(deleted.threadIdMap).toEqual({});
    expect(deleted.threadIds).toEqual([]);
    expect(deleted.archivedThreadIds).toEqual([]);
  });
});
