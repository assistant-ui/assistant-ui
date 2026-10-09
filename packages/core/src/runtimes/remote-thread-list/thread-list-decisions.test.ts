import { describe, expect, it } from "vitest";
import {
  isSelectedThread,
  removalFallback,
  selectRemovalDraft,
  shouldStartFallbackSwitch,
  shouldUnarchiveSwitchTarget,
  switchTarget,
} from "./thread-list-decisions";
import {
  appendThreadPage,
  createEmptyRemoteThreadState,
  getThreadData,
  seedNewThread,
} from "./remote-thread-state";

const listed = () =>
  appendThreadPage(createEmptyRemoteThreadState(), {
    threads: [
      { status: "regular", remoteId: "first" },
      { status: "regular", remoteId: "second" },
    ],
  });

describe("thread list decisions", () => {
  it("matches a selected slot by its remote identity", () => {
    const state = listed();
    expect(isSelectedThread(state, "first", "first")).toBe(true);
    expect(isSelectedThread(state, "first", "second")).toBe(false);
    expect(isSelectedThread(state, "absent", "first")).toBe(false);
    const first = getThreadData(state, "first")!;
    const duplicate = {
      ...state,
      threadData: {
        ...state.threadData,
        [state.threadIdMap.second!]: {
          ...getThreadData(state, "second")!,
          remoteId: first.remoteId,
        },
      },
    };
    expect(isSelectedThread(duplicate, "first", "second")).toBe(true);
  });

  it("starts a fallback only without a switch task or after awaiting that task", () => {
    const task = Promise.resolve();
    const other = Promise.resolve();
    expect(shouldStartFallbackSwitch(undefined, undefined)).toBe(true);
    expect(shouldStartFallbackSwitch(task, task)).toBe(true);
    expect(shouldStartFallbackSwitch(task, other)).toBe(false);
  });

  it("keeps a live main thread, waits for an initializing draft, and selects a draft for a removed main", () => {
    const state = listed();
    expect(removalFallback(state, state, "first", true)).toBe("none");
    const archived = appendThreadPage(createEmptyRemoteThreadState(), {
      threads: [{ status: "archived", remoteId: "first" }],
    });
    expect(removalFallback(archived, state, "first", false)).toBe("none");
    expect(removalFallback(archived, state, "first", true)).toBe("wait");
    const draft = seedNewThread(state);
    expect(removalFallback(state, draft.state, "missing", true)).toBe("wait");
    expect(removalFallback(state, state, "missing", true)).toBe("draft");
  });

  it("reuses the existing draft or seeds one when main is removed", () => {
    const state = listed();
    const seeded = seedNewThread(state);
    expect(selectRemovalDraft(seeded.state, state)).toEqual({
      state: seeded.state,
      id: seeded.id,
    });
    const created = selectRemovalDraft(state, state);
    expect(created.state.newThreadId).toBe(created.id);
    expect(getThreadData(created.state, created.id)?.status).toBe("new");
  });

  it("rejects stale and removed switch targets and unarchives only when requested", () => {
    const state = listed();
    const archived = appendThreadPage(createEmptyRemoteThreadState(), {
      threads: [{ status: "archived", remoteId: "first" }],
    });
    const target = switchTarget(archived, "first", 2, 2)!;
    expect(target.id).toBe("first");
    expect(switchTarget(archived, "first", 1, 2)).toBeUndefined();
    expect(switchTarget(archived, "missing", 2, 2)).toBeUndefined();
    expect(shouldUnarchiveSwitchTarget(target, undefined)).toBe(true);
    expect(shouldUnarchiveSwitchTarget(target, { unarchive: false })).toBe(
      false,
    );
    expect(
      shouldUnarchiveSwitchTarget(getThreadData(state, "first")!, undefined),
    ).toBe(false);
  });
});
