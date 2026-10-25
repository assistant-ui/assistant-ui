import { describe, expect, it } from "vitest";
import {
  createAgUiThreadState,
  reduceAgUiThreadState,
} from "./agUiThreadState";

describe("reduceAgUiThreadState", () => {
  it("tracks run and load phases without changing state for repeated phases", () => {
    const initial = createAgUiThreadState();
    expect(reduceAgUiThreadState(initial, { type: "runFinished" })).toBe(
      initial,
    );
    expect(reduceAgUiThreadState(initial, { type: "loadFinished" })).toBe(
      initial,
    );

    const running = reduceAgUiThreadState(initial, { type: "runStarted" });
    const requested = reduceAgUiThreadState(running, { type: "loadRequested" });
    const loading = reduceAgUiThreadState(requested, { type: "loadStarted" });
    expect(loading).toMatchObject({
      isRunning: true,
      isLoading: true,
      loadRequested: true,
    });
    expect(reduceAgUiThreadState(running, { type: "runStarted" })).toBe(
      running,
    );
    expect(reduceAgUiThreadState(requested, { type: "loadRequested" })).toBe(
      requested,
    );
    expect(reduceAgUiThreadState(loading, { type: "loadStarted" })).toBe(
      loading,
    );
    expect(initial).toMatchObject({
      isRunning: false,
      isLoading: false,
      loadRequested: false,
    });

    const stopped = reduceAgUiThreadState(loading, { type: "runFinished" });
    const loaded = reduceAgUiThreadState(stopped, { type: "loadFinished" });
    expect(loaded.isRunning).toBe(false);
    expect(loaded.isLoading).toBe(false);
    expect(loaded.loadRequested).toBe(true);
  });

  it("advances history mutation generation across thread resets", () => {
    const initial = createAgUiThreadState();
    const first = reduceAgUiThreadState(initial, {
      type: "historyMutationAdvanced",
    });
    const reset = reduceAgUiThreadState(first, { type: "resetThread" });
    const second = reduceAgUiThreadState(reset, {
      type: "historyMutationAdvanced",
    });
    expect(initial.historyMutationGeneration).toBe(0);
    expect(reset.historyMutationGeneration).toBe(1);
    expect(second.historyMutationGeneration).toBe(2);
  });

  it("replaces the state snapshot", () => {
    const initial = createAgUiThreadState();
    const snapshot = { count: 1 };
    const first = reduceAgUiThreadState(initial, {
      type: "stateSnapshot",
      snapshot,
    });
    expect(first.stateSnapshot).toBe(snapshot);
    expect(
      reduceAgUiThreadState(first, { type: "stateSnapshot", snapshot }),
    ).toBe(first);
  });

  it("sets and resets state snapshots", () => {
    const initial = createAgUiThreadState();
    const first = reduceAgUiThreadState(initial, {
      type: "stateSnapshot",
      snapshot: { count: 1 },
    });
    const second = reduceAgUiThreadState(first, {
      type: "stateSnapshot",
      snapshot: { count: 2 },
    });
    expect(second.stateSnapshot).toEqual({ count: 2 });
    expect(first.stateSnapshot).toEqual({ count: 1 });
    expect(
      reduceAgUiThreadState(second, {
        type: "stateSnapshot",
        snapshot: second.stateSnapshot!,
      }),
    ).toBe(second);
    const reset = reduceAgUiThreadState(second, { type: "resetState" });
    expect(reset.stateSnapshot).toBeUndefined();
    expect(reduceAgUiThreadState(reset, { type: "resetState" })).toBe(reset);
  });

  it("records run config and manages deferred continuations by owner", () => {
    const initial = createAgUiThreadState();
    const runConfig = {};
    const configured = reduceAgUiThreadState(initial, {
      type: "runConfigRecorded",
      runConfig,
    });
    expect(configured.lastRunConfig).toBe(runConfig);
    expect(
      reduceAgUiThreadState(configured, {
        type: "runConfigRecorded",
        runConfig,
      }),
    ).toBe(configured);

    const owner = new AbortController();
    const withResume = reduceAgUiThreadState(configured, {
      type: "resumeDeferred",
      owner,
      messageId: "assistant",
    });
    expect(withResume.pendingResume).toEqual({
      owner,
      messageIds: ["assistant"],
    });
    expect(
      reduceAgUiThreadState(withResume, {
        type: "resumeDeferred",
        owner,
        messageId: "assistant",
      }),
    ).toBe(withResume);
    const withTwoOwners = reduceAgUiThreadState(withResume, {
      type: "resumeDeferred",
      owner,
      messageId: "assistant-next",
    });
    expect(withTwoOwners.pendingResume).toEqual({
      owner,
      messageIds: ["assistant", "assistant-next"],
    });
    expect(
      reduceAgUiThreadState(withTwoOwners, {
        type: "resumeDeferred",
        owner: new AbortController(),
        messageId: "new-run",
      }).pendingResume?.messageIds,
    ).toEqual(["new-run"]);
    const withOwner = reduceAgUiThreadState(withResume, {
      type: "a2uiResumeDeferred",
      owner,
    });
    const action = { value: "submit" };
    const withAction = reduceAgUiThreadState(withOwner, {
      type: "a2uiActionDeferred",
      action,
    });
    expect(withAction.pendingA2uiResumeOwner).toBe(owner);
    expect(withAction.pendingA2uiAction).toBe(action);
    expect(
      reduceAgUiThreadState(withOwner, { type: "a2uiResumeDeferred", owner }),
    ).toBe(withOwner);
    expect(
      reduceAgUiThreadState(withAction, { type: "a2uiActionDeferred", action }),
    ).toBe(withAction);

    const actionCleared = reduceAgUiThreadState(withAction, {
      type: "a2uiActionCleared",
    });
    expect(actionCleared.pendingA2uiAction).toBeUndefined();
    expect(actionCleared.pendingA2uiResumeOwner).toBe(owner);
    const ownerCleared = reduceAgUiThreadState(actionCleared, {
      type: "a2uiResumeCleared",
    });
    expect(ownerCleared.pendingA2uiResumeOwner).toBeNull();
    expect(
      reduceAgUiThreadState(ownerCleared, { type: "a2uiResumeCleared" }),
    ).toBe(ownerCleared);
    expect(
      reduceAgUiThreadState(ownerCleared, { type: "a2uiActionCleared" }),
    ).toBe(ownerCleared);
    const resumeCleared = reduceAgUiThreadState(ownerCleared, {
      type: "resumeCleared",
    });
    expect(resumeCleared.pendingResume).toBeNull();
    expect(
      reduceAgUiThreadState(resumeCleared, { type: "resumeCleared" }),
    ).toBe(resumeCleared);
  });

  it("clears A2UI continuations and resets thread state without changing run flags", () => {
    const owner = new AbortController();
    let state = reduceAgUiThreadState(createAgUiThreadState(), {
      type: "runStarted",
    });
    state = reduceAgUiThreadState(state, { type: "loadStarted" });
    state = reduceAgUiThreadState(state, {
      type: "resumeDeferred",
      owner,
      messageId: "assistant",
    });
    state = reduceAgUiThreadState(state, {
      type: "a2uiResumeDeferred",
      owner,
    });
    state = reduceAgUiThreadState(state, {
      type: "a2uiActionDeferred",
      action: { value: "submit" },
    });
    const cleared = reduceAgUiThreadState(state, {
      type: "a2uiContinuationsCleared",
    });
    expect(cleared.pendingA2uiResumeOwner).toBeNull();
    expect(cleared.pendingA2uiAction).toBeUndefined();
    expect(cleared.pendingResume).toEqual({ owner, messageIds: ["assistant"] });
    expect(
      reduceAgUiThreadState(cleared, { type: "a2uiContinuationsCleared" }),
    ).toBe(cleared);

    const reset = reduceAgUiThreadState(state, { type: "resetThread" });
    expect(reset).toMatchObject({ isRunning: true, isLoading: true });
    expect(reset.stateSnapshot).toBeUndefined();
    expect(reset.pendingResume).toBeNull();
    expect(reset.pendingA2uiResumeOwner).toBeNull();
    expect(reset.pendingA2uiAction).toBeUndefined();
    expect(reduceAgUiThreadState(reset, { type: "resetThread" })).toBe(reset);
  });
});
