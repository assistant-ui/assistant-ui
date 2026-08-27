import { describe, expect, it } from "vitest";
import {
  createEmptyRemoteThreadState,
  createThreadMappingId,
  seedNewThread,
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
});
