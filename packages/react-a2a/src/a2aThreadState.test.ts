import { describe, expect, it } from "vitest";
import { createA2AThreadState, reduceA2AThreadState } from "./a2aThreadState";
import type {
  A2AAgentCard,
  A2AArtifact,
  A2AMessage,
  A2ATask,
  A2ATaskArtifactUpdateEvent,
  A2ATaskStatusUpdateEvent,
} from "./types";

const statusEvent = (
  state: A2ATask["status"]["state"],
): A2ATaskStatusUpdateEvent => ({
  taskId: "task-1",
  contextId: "context-1",
  status: { state },
});

const artifactEvent = (
  artifact: A2AArtifact,
  options: Partial<A2ATaskArtifactUpdateEvent> = {},
): A2ATaskArtifactUpdateEvent => ({
  taskId: "task-1",
  contextId: "context-1",
  artifact,
  ...options,
});

const surfaceMessage: A2AMessage = {
  messageId: "message-1",
  role: "agent",
  parts: [
    {
      data: {
        version: "v0.9",
        createSurface: { surfaceId: "summary" },
      },
    },
  ],
};

describe("reduceA2AThreadState", () => {
  it("creates and updates a task from status events without dropping its artifacts", () => {
    const initial = createA2AThreadState();
    const working = reduceA2AThreadState(initial, {
      type: "statusUpdate",
      event: statusEvent("working"),
    });
    expect(working.currentTask).toEqual({
      id: "task-1",
      contextId: "context-1",
      status: { state: "working" },
    });
    expect(working.contextId).toBe("context-1");

    const withArtifact = reduceA2AThreadState(working, {
      type: "artifactUpdate",
      event: artifactEvent({ artifactId: "file-1", parts: [{ text: "a" }] }),
    });
    const completed = reduceA2AThreadState(withArtifact, {
      type: "statusUpdate",
      event: statusEvent("completed"),
    });
    expect(completed.currentTask?.status.state).toBe("completed");
    expect(completed.currentArtifacts[0]?.parts).toEqual([{ text: "a" }]);
    expect(working.currentTask?.status.state).toBe("working");
  });

  it("appends or replaces artifact parts and retains the updated final chunk", () => {
    const first = reduceA2AThreadState(createA2AThreadState(), {
      type: "artifactUpdate",
      event: artifactEvent({ artifactId: "file-1", parts: [{ text: "a" }] }),
    });
    const appended = reduceA2AThreadState(first, {
      type: "artifactUpdate",
      event: artifactEvent(
        { artifactId: "file-1", parts: [{ text: "b" }] },
        { append: true, lastChunk: true },
      ),
    });
    expect(appended.currentArtifacts).toEqual([
      { artifactId: "file-1", parts: [{ text: "a" }, { text: "b" }] },
    ]);
    expect(first.currentArtifacts[0]?.parts).toEqual([{ text: "a" }]);

    const replaced = reduceA2AThreadState(appended, {
      type: "artifactUpdate",
      event: artifactEvent({ artifactId: "file-1", parts: [{ text: "c" }] }),
    });
    expect(replaced.currentArtifacts[0]?.parts).toEqual([{ text: "c" }]);
  });

  it("merges partial task artifacts and rebuilds from a complete snapshot", () => {
    const first = reduceA2AThreadState(createA2AThreadState(), {
      type: "artifactUpdate",
      event: artifactEvent({ artifactId: "file-1", parts: [{ text: "live" }] }),
    });
    const partial = reduceA2AThreadState(first, {
      type: "taskSnapshot",
      task: {
        id: "task-1",
        status: { state: "working" },
        artifacts: [
          { artifactId: "file-1", parts: [{ text: "stale" }] },
          { artifactId: "file-2", parts: [{ text: "new" }] },
        ],
      },
    });
    expect(partial.currentArtifacts).toEqual([
      { artifactId: "file-1", parts: [{ text: "live" }] },
      { artifactId: "file-2", parts: [{ text: "new" }] },
    ]);

    const complete = reduceA2AThreadState(partial, {
      type: "taskSnapshot",
      task: {
        id: "task-1",
        status: { state: "completed" },
        history: [],
        artifacts: [{ artifactId: "file-1", parts: [{ text: "final" }] }],
      },
    });
    expect(complete.currentArtifacts).toEqual([
      { artifactId: "file-1", parts: [{ text: "final" }] },
    ]);
  });

  it("tracks A2UI message ids and skips replay without mutating prior state", () => {
    const initial = createA2AThreadState();
    const first = reduceA2AThreadState(initial, {
      type: "a2uiMessage",
      message: surfaceMessage,
    });
    expect(first.a2uiMessageIds.has("message-1")).toBe(true);
    expect(initial.a2uiMessageIds.size).toBe(0);
    expect(first.a2uiState.has("summary")).toBe(true);
    expect(
      reduceA2AThreadState(first, {
        type: "a2uiMessage",
        message: surfaceMessage,
        replay: true,
      }),
    ).toBe(first);
  });

  it("replays A2UI history when a complete task snapshot replaces the surface map", () => {
    const first = reduceA2AThreadState(createA2AThreadState(), {
      type: "a2uiMessage",
      message: surfaceMessage,
    });
    const complete = reduceA2AThreadState(first, {
      type: "taskSnapshot",
      task: {
        id: "task-1",
        status: { state: "completed" },
        history: [surfaceMessage],
        artifacts: [],
      },
    });
    expect(complete.a2uiState.has("summary")).toBe(true);
    expect(complete.a2uiState).not.toBe(first.a2uiState);
    expect(complete.a2uiMessageIds.has("message-1")).toBe(true);
  });

  it.each(["completed", "failed", "canceled", "rejected"] as const)(
    "clears a %s task before the next run",
    (status) => {
      const withTask = reduceA2AThreadState(createA2AThreadState(), {
        type: "statusUpdate",
        event: statusEvent(status),
      });
      expect(
        reduceA2AThreadState(withTask, { type: "prepareRun" }).currentTask,
      ).toBeUndefined();
    },
  );

  it("prepares a new run, resets external state, and preserves the context seed", () => {
    const withTask = reduceA2AThreadState(createA2AThreadState("seed"), {
      type: "statusUpdate",
      event: statusEvent("failed"),
    });
    const prepared = reduceA2AThreadState(withTask, { type: "prepareRun" });
    expect(prepared.currentTask).toBeUndefined();
    expect(prepared.contextId).toBe("context-1");

    const running = reduceA2AThreadState(prepared, { type: "runStarted" });
    const loading = reduceA2AThreadState(running, { type: "loadStarted" });
    const reset = reduceA2AThreadState(loading, { type: "reset" });
    expect(reset.isRunning).toBe(true);
    expect(reset.isLoading).toBe(true);
    expect(reset.currentArtifacts).toEqual([]);
    expect(reset.a2uiMessageIds.size).toBe(0);
    const contextReset = reduceA2AThreadState(reset, {
      type: "resetContext",
      contextId: "seed",
    });
    expect(contextReset.contextId).toBe("seed");
    expect(contextReset.isLoading).toBe(false);
    expect(
      reduceA2AThreadState(contextReset, { type: "runFinished" }).isRunning,
    ).toBe(false);
  });

  it("returns the same state when a flag or context already matches", () => {
    const initial = createA2AThreadState("seed");
    expect(reduceA2AThreadState(initial, { type: "runFinished" })).toBe(
      initial,
    );
    expect(reduceA2AThreadState(initial, { type: "loadFinished" })).toBe(
      initial,
    );
    expect(
      reduceA2AThreadState(initial, {
        type: "contextLearned",
        contextId: "seed",
      }),
    ).toBe(initial);
  });

  it("records agent capabilities, requested loads, and explicit context changes", () => {
    const initial = createA2AThreadState("seed");
    const card = { capabilities: { streaming: false } } as A2AAgentCard;
    const loaded = reduceA2AThreadState(initial, {
      type: "agentCardLoaded",
      agentCard: card,
    });
    expect(loaded.agentCard).toBe(card);
    const requested = reduceA2AThreadState(loaded, {
      type: "loadRequested",
    });
    expect(requested.loadRequested).toBe(true);
    expect(reduceA2AThreadState(requested, { type: "loadRequested" })).toBe(
      requested,
    );
    expect(
      reduceA2AThreadState(requested, {
        type: "contextLearned",
        contextId: undefined,
      }).contextId,
    ).toBeUndefined();
  });
});
