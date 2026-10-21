import { describe, expect, it } from "vitest";
import {
  createAdkThreadState,
  getToolResultOwnerKey,
  reduceAdkThreadState,
} from "./adkThreadState";
import type { AdkMessage } from "./types";

const message: AdkMessage = {
  id: "message-1",
  type: "human",
  content: "hello",
};

const interruptAnswer = (
  id: string,
): Extract<AdkMessage, { type: "tool" }> => ({
  id: `answer-${id}`,
  type: "tool",
  name: "adk_request_input",
  tool_call_id: id,
  content: id,
});

describe("getToolResultOwnerKey", () => {
  it("uses the producing run, then the loaded assistant message, then the call id", () => {
    const state = {
      ...createAdkThreadState(),
      messages: [
        {
          id: "loaded-message",
          type: "ai" as const,
          content: "",
          tool_calls: [
            { id: "known", name: "lookup", args: {} },
            { id: "loaded", name: "lookup", args: {} },
          ],
        },
      ],
      runIdByToolCallId: new Map([["known", "run-1"]]),
    };

    expect(getToolResultOwnerKey(state, "known")).toBe("run:run-1");
    expect(getToolResultOwnerKey(state, "loaded")).toBe(
      "message:loaded-message",
    );
    expect(getToolResultOwnerKey(state, "orphan")).toBe("message:orphan");
  });
});

describe("reduceAdkThreadState", () => {
  it("preserves the sent user id and its queued and staged references when publishing events", () => {
    const userId = "client-user";
    const user = { ...message, id: userId };
    const heldReply = interruptAnswer("call-1");
    const state = {
      ...createAdkThreadState(),
      messages: [message, user, heldReply],
      queuedMessageIds: new Set([userId]),
      stagedEntries: new Map([
        [userId, { message: user, runConfig: undefined }],
      ]),
      messageMetadata: new Map([
        [userId, { usageMetadata: { promptTokenCount: 1 } }],
      ]),
      toolResultBuffer: new Map([["call-1", heldReply]]),
    };
    const next = reduceAdkThreadState(state, {
      type: "event.published",
      state: {
        ...state,
        messages: [
          ...state.messages,
          { id: "run-1:ai", type: "ai", content: "Hello" },
        ],
      },
    });
    expect(next.messages.map((item) => item.id)).toEqual([
      message.id,
      userId,
      heldReply.id,
      "run-1:ai",
    ]);
    expect([...next.queuedMessageIds]).toEqual([userId]);
    expect([...next.stagedEntries.keys()]).toEqual([userId]);
    expect(next.stagedEntries.get(userId)?.message.id).toBe(userId);
    expect(next.messageMetadata.get(userId)).toEqual({
      usageMetadata: { promptTokenCount: 1 },
    });
    expect(next.toolResultBuffer).toEqual(state.toolResultBuffer);
  });

  it("flushes healthy answers when an unrelated run fails", () => {
    const state = {
      ...createAdkThreadState(),
      toolResultBuffer: new Map([
        ["failed", interruptAnswer("failed")],
        ["healthy", interruptAnswer("healthy")],
      ]),
      runIdByToolCallId: new Map([
        ["failed", "1"],
        ["healthy", "2"],
      ]),
      failedRunIds: new Set(["1"]),
    };
    const flushed = reduceAdkThreadState(state, {
      type: "results.flush",
      runId: "1",
      failed: true,
    });
    expect(flushed.readyBatch).toEqual([interruptAnswer("healthy")]);
    expect([...flushed.toolResultBuffer.keys()]).toEqual(["failed"]);
  });

  it("holds a failing run's own complete reply group", () => {
    const state = {
      ...createAdkThreadState(),
      toolResultBuffer: new Map([["failed", interruptAnswer("failed")]]),
      runIdByToolCallId: new Map([["failed", "1"]]),
      failedRunIds: new Set(["1"]),
    };
    const flushed = reduceAdkThreadState(state, {
      type: "results.flush",
      runId: "1",
      failed: true,
    });
    expect(flushed.readyBatch).toBeNull();
    expect([...flushed.toolResultBuffer.keys()]).toEqual(["failed"]);
  });

  it("releases a failed owner's later reply after its continuation finishes", () => {
    const failed = {
      ...createAdkThreadState(),
      nextRunId: 1,
      runIdByToolCallId: new Map([
        ["first", "1"],
        ["later", "1"],
      ]),
      failedRunIds: new Set(["1"]),
    };
    const first = reduceAdkThreadState(failed, {
      type: "results.received",
      message: interruptAnswer("first"),
    });
    expect(first.readyBatch).toEqual([interruptAnswer("first")]);
    const continuing = reduceAdkThreadState(first, { type: "run.active" });
    const held = reduceAdkThreadState(continuing, {
      type: "results.received",
      message: interruptAnswer("later"),
    });
    expect(held.readyBatch).toBeNull();
    const finished = reduceAdkThreadState(held, {
      type: "run.finished",
      runId: "2",
    });
    const flushed = reduceAdkThreadState(finished, {
      type: "results.flush",
      runId: "2",
      failed: false,
    });
    expect(flushed.readyBatch).toEqual([interruptAnswer("later")]);
    expect(flushed.toolResultBuffer.size).toBe(0);
  });

  it("sends one producing run's answers per flushed batch", () => {
    const state = {
      ...createAdkThreadState(),
      toolResultBuffer: new Map([
        ["first", interruptAnswer("first")],
        ["second", interruptAnswer("second")],
      ]),
      runIdByToolCallId: new Map([
        ["first", "1"],
        ["second", "2"],
      ]),
    };
    const first = reduceAdkThreadState(state, {
      type: "results.flush",
      runId: "2",
      failed: false,
    });
    expect(first.readyBatch).toEqual([interruptAnswer("first")]);
    expect([...first.toolResultBuffer.keys()]).toEqual(["second"]);
    const second = reduceAdkThreadState(first, {
      type: "results.flush",
      runId: "3",
      failed: false,
    });
    expect(second.readyBatch).toEqual([interruptAnswer("second")]);
    expect(second.toolResultBuffer.size).toBe(0);
  });

  it("flushes held replies from one loaded assistant message together", () => {
    const answer = (id: string) => ({
      ...interruptAnswer(id),
      name: "adk_request_confirmation",
    });
    const calls: AdkMessage = {
      id: "loaded",
      type: "ai",
      content: "",
      tool_calls: ["c1", "c2", "c3"].map((id) => ({
        id,
        name: "adk_request_confirmation",
        args: {},
      })),
    };
    let state = reduceAdkThreadState(
      {
        ...createAdkThreadState(),
        messages: [
          calls,
          {
            id: "other",
            type: "ai",
            content: "",
            tool_calls: [
              { id: "other-call", name: "adk_request_confirmation", args: {} },
            ],
          },
        ],
      },
      { type: "run.active" },
    );
    for (const id of ["c1", "c2", "c3", "other-call"]) {
      state = reduceAdkThreadState(state, {
        type: "results.received",
        message: answer(id),
      });
      expect(state.readyBatch).toBeNull();
    }
    state = reduceAdkThreadState(state, { type: "run.finished", runId: "1" });

    const flushed = reduceAdkThreadState(state, {
      type: "results.flush",
      runId: "1",
      failed: false,
    });
    expect(flushed.readyBatch).toEqual([
      answer("c1"),
      answer("c2"),
      answer("c3"),
    ]);
    expect([...flushed.toolResultBuffer.keys()]).toEqual(["other-call"]);
    const next = reduceAdkThreadState(flushed, {
      type: "results.flush",
      runId: "1",
      failed: false,
    });
    expect(next.readyBatch).toEqual([answer("other-call")]);
    expect(next.toolResultBuffer.size).toBe(0);
  });

  it("tracks queued projections and removes only queued messages", () => {
    const queued = { ...message, id: "queued" };
    const initial = { ...createAdkThreadState(), messages: [message] };
    const projected = reduceAdkThreadState(initial, {
      type: "messages.queued",
      messages: [message, queued],
      ids: ["queued"],
    });
    expect([...projected.queuedMessageIds]).toEqual(["queued"]);
    expect(initial.queuedMessageIds.size).toBe(0);

    const removed = reduceAdkThreadState(projected, {
      type: "messages.queue.remove",
      ids: ["queued", "message-1"],
    });
    expect(removed.messages).toEqual([message]);
    expect(removed.queuedMessageIds.size).toBe(0);
    expect(
      reduceAdkThreadState(removed, {
        type: "messages.queue.remove",
        ids: ["missing"],
      }),
    ).toBe(removed);
  });

  it("keeps queued messages through published events and clears queue flags on replacement", () => {
    const queued = { ...message, id: "queued" };
    const projected = reduceAdkThreadState(createAdkThreadState(), {
      type: "messages.queued",
      messages: [queued],
      ids: ["queued"],
    });
    const base = createAdkThreadState();
    const publishedState = {
      messages: [message],
      stateDelta: base.stateDelta,
      agentInfo: base.agentInfo,
      longRunningToolIds: base.longRunningToolIds,
      artifactDelta: base.artifactDelta,
      toolConfirmations: base.toolConfirmations,
      authRequests: base.authRequests,
      escalated: base.escalated,
      messageMetadata: base.messageMetadata,
    };
    const published = reduceAdkThreadState(projected, {
      type: "event.published",
      state: publishedState,
    });
    expect(published.messages).toEqual([message, queued]);
    expect(
      reduceAdkThreadState(published, {
        type: "messages.replaced",
        messages: [message],
      }).queuedMessageIds.size,
    ).toBe(0);
    expect(
      reduceAdkThreadState(published, {
        type: "snapshot.applied",
        snapshot: { messages: [message] },
      }).queuedMessageIds.size,
    ).toBe(0);
  });

  it("stages messages by id without changing the prior state", () => {
    const initial = createAdkThreadState();
    const first = {
      message: { ...message },
      runConfig: { custom: { model: "first" } },
    };
    const second = {
      message: { ...message, id: "message-2" },
      runConfig: { custom: { model: "second" } },
    };

    const staged = reduceAdkThreadState(initial, {
      type: "staged.stage",
      entry: first,
    });
    const next = reduceAdkThreadState(staged, {
      type: "staged.stage",
      entry: second,
    });

    expect(initial.stagedEntries.size).toBe(0);
    expect(staged.stagedEntries?.size).toBe(1);
    expect([...next.stagedEntries!]).toEqual([
      ["message-1", first],
      ["message-2", second],
    ]);
    expect(staged.stagedEntries?.size).toBe(1);
  });

  it("rolls back a run without losing staged entries or run ownership", () => {
    const toolCall: AdkMessage = {
      id: "tool-call",
      type: "ai",
      content: "calling tool",
      tool_calls: [{ id: "call-1", name: "lookup", args: {} }],
    };
    const stagedMessage: AdkMessage = {
      ...message,
      id: "staged-1",
      content: "staged",
    };
    const before = {
      ...createAdkThreadState(),
      messages: [toolCall, stagedMessage],
      stagedEntries: new Map([
        [
          "staged-1",
          {
            message: stagedMessage as AdkMessage & { id: string },
            runConfig: { custom: { model: "staged" } },
          },
        ],
      ]),
      runConfigByToolCallId: new Map([
        ["call-1", { custom: { model: "original" } }],
      ]),
    };
    const pruned = reduceAdkThreadState(before, {
      type: "messages.prune",
      history: [],
    });
    const replaced = reduceAdkThreadState(pruned, {
      type: "messages.replaced",
      messages: [],
    });
    const unstaged = reduceAdkThreadState(replaced, {
      type: "staged.unstage",
      ids: ["staged-1"],
    });
    const active = reduceAdkThreadState(unstaged, { type: "run.active" });
    const started = reduceAdkThreadState(active, {
      type: "run.started",
      messages: [],
      queuedMessageIds: [],
      longRunningToolIds: [],
      toolConfirmations: [],
      authRequests: [],
    });
    const rolledBack = reduceAdkThreadState(started, {
      type: "run.rollback",
      state: before,
    });

    expect(rolledBack.messages).toEqual([toolCall, stagedMessage]);
    expect([...rolledBack.stagedEntries.keys()]).toEqual(["staged-1"]);
    expect(rolledBack.runConfigByToolCallId.get("call-1")).toEqual({
      custom: { model: "original" },
    });
    expect(rolledBack.currentRunId).toBe(active.currentRunId);
    expect(rolledBack.activeRunIds).toBe(active.activeRunIds);
  });

  it("does not restore a queued snapshot message cancelled from live state", () => {
    const queued = { ...message, id: "queued" };
    const snapshot = {
      ...createAdkThreadState(),
      messages: [message, queued],
      queuedMessageIds: new Set([queued.id]),
    };
    const live = reduceAdkThreadState(snapshot, {
      type: "messages.queue.remove",
      ids: [queued.id],
    });

    const restored = reduceAdkThreadState(live, {
      type: "run.rollback",
      state: snapshot,
    });

    expect(restored.messages).toEqual([message]);
  });

  it("keeps queued sends and their answers in live order on rollback", () => {
    const questionB = { ...message, id: "qb", content: "Qb" };
    const questionC = { ...message, id: "qc", content: "Qc" };
    const answerB: AdkMessage = { id: "ab", type: "ai", content: "Ab" };
    const answerC: AdkMessage = { id: "ac", type: "ai", content: "Ac" };
    const snapshot = {
      ...createAdkThreadState(),
      messages: [message, questionB, questionC],
      queuedMessageIds: new Set([questionB.id, questionC.id]),
    };
    const live = {
      ...snapshot,
      messages: [message, questionB, answerB, questionC, answerC],
      queuedMessageIds: new Set<string>(),
    };

    const restored = reduceAdkThreadState(live, {
      type: "run.rollback",
      state: snapshot,
    });

    expect(restored.messages.map((entry) => entry.id)).toEqual([
      "message-1",
      "qb",
      "ab",
      "qc",
      "ac",
    ]);
  });

  it("keeps answered calls settled and places restaged messages after their results", () => {
    const call: AdkMessage = {
      id: "call",
      type: "ai",
      content: "calling",
      tool_calls: [{ id: "x", name: "lookup", args: {} }],
    };
    const result: AdkMessage = {
      id: "result",
      type: "tool",
      tool_call_id: "x",
      name: "lookup",
      content: "answer",
    };
    const staged = { id: "staged", type: "human" as const, content: "retry" };
    const confirmation = {
      toolCallId: "x",
      toolName: "lookup",
      args: {},
      hint: "approve",
      confirmed: false,
    };
    const auth = { toolCallId: "x", authConfig: {} };
    const snapshot = {
      ...createAdkThreadState(),
      messages: [call, staged],
      longRunningToolIds: ["x"],
      toolConfirmations: [confirmation],
      authRequests: [auth],
    };
    const live = {
      ...snapshot,
      messages: [call, result],
      stagedEntries: new Map([
        [staged.id, { message: staged, runConfig: undefined }],
      ]),
      longRunningToolIds: [],
      toolConfirmations: [],
      authRequests: [],
    };

    const restored = reduceAdkThreadState(live, {
      type: "run.rollback",
      state: snapshot,
    });

    expect(restored.messages.map((entry) => entry.id)).toEqual([
      "call",
      "result",
      "staged",
    ]);
    expect(restored.longRunningToolIds).toEqual([]);
    expect(restored.toolConfirmations).toEqual([]);
    expect(restored.authRequests).toEqual([]);
  });

  it("does not restore a snapshot older than the latest load", () => {
    const freshMessage: AdkMessage = {
      id: "fresh",
      type: "ai",
      content: "new history",
    };
    const snapshot = {
      ...createAdkThreadState(),
      messages: [message],
      longRunningToolIds: ["old"],
    };
    const fresh = reduceAdkThreadState(snapshot, {
      type: "snapshot.applied",
      snapshot: { messages: [freshMessage], longRunningToolIds: ["fresh"] },
    });
    const failed = {
      ...fresh,
      messages: [...fresh.messages, { ...message, id: "failed" }],
    };
    const restored = reduceAdkThreadState(failed, {
      type: "run.rollback",
      state: snapshot,
      ownIds: ["failed"],
    });

    expect(restored.messages).toEqual([freshMessage]);
    expect(restored.longRunningToolIds).toEqual(["fresh"]);
    expect(restored.loadGeneration).toBe(fresh.loadGeneration);
  });

  it("restages only a failed send's staged entries after a newer load", () => {
    const stagedMessage = { ...message, id: "staged", content: "retry" };
    const unrelated = { ...message, id: "unrelated" };
    const alreadyStaged = { ...message, id: "already-staged" };
    const freshMessage = { ...message, id: "fresh", content: "new history" };
    const snapshot = {
      ...createAdkThreadState(),
      messages: [stagedMessage, unrelated, alreadyStaged],
      stagedEntries: new Map([
        [stagedMessage.id, { message: stagedMessage, runConfig: undefined }],
        [unrelated.id, { message: unrelated, runConfig: undefined }],
        [alreadyStaged.id, { message: alreadyStaged, runConfig: undefined }],
      ]),
    };
    const liveEntry = {
      message: { ...alreadyStaged, content: "live staged" },
      runConfig: undefined,
    };
    const fresh = {
      ...reduceAdkThreadState(snapshot, {
        type: "snapshot.applied",
        snapshot: { messages: [freshMessage] },
      }),
      messages: [freshMessage, stagedMessage, alreadyStaged],
      stagedEntries: new Map([[alreadyStaged.id, liveEntry]]),
      queuedMessageIds: new Set([stagedMessage.id, "other-queued"]),
    };
    const restored = reduceAdkThreadState(fresh, {
      type: "run.rollback",
      state: snapshot,
      ownIds: [stagedMessage.id, alreadyStaged.id],
    });

    expect(restored.messages).toEqual([freshMessage, stagedMessage]);
    expect([...restored.stagedEntries]).toEqual([
      [alreadyStaged.id, liveEntry],
      [stagedMessage.id, snapshot.stagedEntries.get(stagedMessage.id)],
    ]);
    expect([...restored.queuedMessageIds]).toEqual(["other-queued"]);
    expect(restored.loadGeneration).toBe(fresh.loadGeneration);
  });

  it("uses the live copy of a settled snapshot message", () => {
    const snapshotMessage: AdkMessage = {
      id: "reply",
      type: "ai",
      content: "partial",
    };
    const liveMessage: AdkMessage = {
      ...snapshotMessage,
      status: { type: "incomplete", reason: "cancelled" },
    };
    const snapshot = { ...createAdkThreadState(), messages: [snapshotMessage] };
    const live = { ...snapshot, messages: [liveMessage] };

    const restored = reduceAdkThreadState(live, {
      type: "run.rollback",
      state: snapshot,
    });

    expect(restored.messages).toEqual([liveMessage]);
  });

  it.each([
    [true, false],
    [false, true],
  ])(
    "combines snapshot escalation %s and live escalation %s",
    (before, after) => {
      const snapshot = { ...createAdkThreadState(), escalated: before };
      const live = { ...createAdkThreadState(), escalated: after };

      expect(
        reduceAdkThreadState(live, {
          type: "run.rollback",
          state: snapshot,
        }).escalated,
      ).toBe(true);
    },
  );

  it("prefers live message metadata during rollback", () => {
    const snapshot = {
      ...createAdkThreadState(),
      messageMetadata: new Map([
        ["shared", { usageMetadata: "snapshot" }],
        ["snapshot", { citationMetadata: "snapshot" }],
      ]),
    };
    const live = {
      ...createAdkThreadState(),
      messageMetadata: new Map([
        ["shared", { usageMetadata: "live" }],
        ["live", { groundingMetadata: "live" }],
      ]),
    };

    expect([
      ...reduceAdkThreadState(live, { type: "run.rollback", state: snapshot })
        .messageMetadata,
    ]).toEqual([
      ["shared", { usageMetadata: "live" }],
      ["snapshot", { citationMetadata: "snapshot" }],
      ["live", { groundingMetadata: "live" }],
    ]);
  });

  it("restores truncated tool state while retaining later sends and tool events", () => {
    const original = {
      ...createAdkThreadState(),
      messages: [
        {
          id: "old",
          type: "ai" as const,
          content: "calling tool",
          tool_calls: [{ id: "old-call", name: "lookup", args: {} }],
        },
      ],
      longRunningToolIds: ["old-call"],
      toolConfirmations: [
        {
          toolCallId: "old-confirm",
          toolName: "approve",
          args: {},
          hint: "old",
          confirmed: false,
        },
      ],
      authRequests: [{ toolCallId: "old-auth", authConfig: {} }],
      runConfigByToolCallId: new Map([["old-call", { model: "old" }]]),
      runIdByToolCallId: new Map([["old-call", "old-run"]]),
    };
    const stagedMessage = {
      id: "staged",
      type: "human" as const,
      content: "staged",
    };
    const queuedMessage = {
      id: "later",
      type: "human" as const,
      content: "later",
    };
    const bufferedResult = {
      id: "result",
      type: "tool" as const,
      tool_call_id: "old-call",
      name: "lookup",
      content: "done",
    };
    const after = {
      ...reduceAdkThreadState(
        reduceAdkThreadState(
          reduceAdkThreadState(original, {
            type: "messages.replaced",
            messages: [],
          }),
          {
            type: "messages.queued",
            messages: [queuedMessage],
            ids: ["later"],
          },
        ),
        {
          type: "staged.stage",
          entry: { message: stagedMessage, runConfig: undefined },
        },
      ),
      messages: [
        queuedMessage,
        stagedMessage,
        {
          id: "own",
          type: "ai" as const,
          content: "calling tools",
          tool_calls: [
            { id: "own-call", name: "lookup", args: {} },
            { id: "own-confirm", name: "adk_request_confirmation", args: {} },
            { id: "own-auth", name: "adk_request_credential", args: {} },
          ],
        },
      ],
      longRunningToolIds: ["later-call", "own-call"],
      toolConfirmations: [
        {
          toolCallId: "later-confirm",
          toolName: "approve",
          args: {},
          hint: "later",
          confirmed: false,
        },
        {
          toolCallId: "own-confirm",
          toolName: "approve",
          args: {},
          hint: "own",
          confirmed: false,
        },
      ],
      authRequests: [
        { toolCallId: "later-auth", authConfig: {} },
        { toolCallId: "own-auth", authConfig: {} },
      ],
      toolResultBuffer: new Map([["old-call", bufferedResult]]),
      runConfigByToolCallId: new Map([
        ["later-call", { model: "later" }],
        ["own-call", { model: "own" }],
      ]),
      runIdByToolCallId: new Map([
        ["later-call", "later-run"],
        ["own-call", "own-run"],
      ]),
    };
    const restored = reduceAdkThreadState(after, {
      type: "run.rollback",
      state: original,
      ownIds: ["own"],
    });

    expect(restored.messages.map((entry) => entry.id)).toEqual([
      "old",
      "later",
      "staged",
    ]);
    expect([...restored.queuedMessageIds]).toEqual(["later"]);
    expect([...restored.stagedEntries.keys()]).toEqual(["staged"]);
    expect(restored.toolResultBuffer.get("old-call")).toEqual(bufferedResult);
    expect(restored.longRunningToolIds).toEqual(["old-call", "later-call"]);
    expect(restored.toolConfirmations.map((item) => item.toolCallId)).toEqual([
      "old-confirm",
      "later-confirm",
    ]);
    expect(restored.authRequests.map((item) => item.toolCallId)).toEqual([
      "old-auth",
      "later-auth",
    ]);
    expect([...restored.runConfigByToolCallId]).toEqual([
      ["old-call", { model: "old" }],
      ["later-call", { model: "later" }],
    ]);
    expect([...restored.runIdByToolCallId]).toEqual([
      ["old-call", "old-run"],
      ["later-call", "later-run"],
    ]);
  });

  it("unstages a promoted run and preserves remaining entries through snapshots", () => {
    const entries = ["message-1", "message-2", "message-3"].map((id) => ({
      message: { ...message, id },
      runConfig: undefined,
    }));
    const staged = entries.reduce(
      (state, entry) =>
        reduceAdkThreadState(state, { type: "staged.stage", entry }),
      createAdkThreadState(),
    );
    const promoted = reduceAdkThreadState(staged, {
      type: "staged.unstage",
      ids: ["message-1", "message-2"],
    });
    const snapshotted = reduceAdkThreadState(promoted, {
      type: "snapshot.applied",
      snapshot: { messages: [message] },
    });

    expect([...promoted.stagedEntries!.keys()]).toEqual(["message-3"]);
    expect([...snapshotted.stagedEntries!.keys()]).toEqual(["message-3"]);
    expect(staged.stagedEntries?.size).toBe(3);
    expect(
      reduceAdkThreadState(promoted, {
        type: "staged.unstage",
        ids: ["missing"],
      }),
    ).toBe(promoted);
  });

  it("merges event deltas and metadata with previous state", () => {
    const previous = {
      ...createAdkThreadState(),
      stagedEntries: new Map([
        ["message-1", { message, runConfig: undefined }],
      ]),
      stateDelta: { retained: 1, replaced: "old" },
      artifactDelta: { retained: 2, replaced: 3 },
      messageMetadata: new Map([
        ["retained", { groundingMetadata: "old" }],
        ["replaced", { citationMetadata: "old" }],
      ]),
    };
    const published = {
      ...createAdkThreadState(),
      messages: [message],
      stateDelta: { replaced: "new" },
      artifactDelta: { replaced: 4 },
      agentInfo: { name: "agent" },
      longRunningToolIds: ["tool-1"],
      escalated: true,
      messageMetadata: new Map([["replaced", { citationMetadata: "new" }]]),
    };
    const { stagedEntries: _stagedEntries, ...publishedState } = published;

    const next = reduceAdkThreadState(previous, {
      type: "event.published",
      state: publishedState,
    });

    expect(next).toMatchObject({
      messages: [message],
      stateDelta: { retained: 1, replaced: "new" },
      artifactDelta: { retained: 2, replaced: 4 },
      agentInfo: { name: "agent" },
      longRunningToolIds: ["tool-1"],
      escalated: true,
    });
    expect([...next.messageMetadata]).toEqual([
      ["retained", { groundingMetadata: "old" }],
      ["replaced", { citationMetadata: "new" }],
    ]);
    expect(next.stagedEntries).toBe(previous.stagedEntries);
    expect(previous.stateDelta).toEqual({ retained: 1, replaced: "old" });
    expect(previous.messageMetadata.get("replaced")).toEqual({
      citationMetadata: "old",
    });

    const withoutMetadata = reduceAdkThreadState(next, {
      type: "event.published",
      state: { ...publishedState, messageMetadata: new Map() },
    });
    expect(withoutMetadata.messageMetadata).toBe(next.messageMetadata);
  });

  it("swaps a snapshot and clears omitted fields", () => {
    const previous = {
      ...createAdkThreadState(),
      stateDelta: { stale: true },
      artifactDelta: { stale: 1 },
      agentInfo: { name: "stale-agent", branch: "stale" },
      longRunningToolIds: ["stale"],
      toolConfirmations: [
        {
          toolCallId: "stale-tool",
          toolName: "approve",
          args: {},
          hint: "stale",
          confirmed: false,
        },
      ],
      authRequests: [{ toolCallId: "stale-auth", authConfig: {} }],
      escalated: true,
      messageMetadata: new Map([["stale", { groundingMetadata: "stale" }]]),
    };
    const snapshot = {
      messages: [message],
      stateDelta: { loaded: true },
      messageMetadata: new Map([["message-1", { usageMetadata: 1 }]]),
    };

    const next = reduceAdkThreadState(previous, {
      type: "snapshot.applied",
      snapshot,
    });

    expect(next).toEqual({
      ...createAdkThreadState(),
      loadGeneration: 1,
      messages: snapshot.messages,
      stateDelta: snapshot.stateDelta,
      agentInfo: {},
      longRunningToolIds: [],
      artifactDelta: {},
      toolConfirmations: [],
      authRequests: [],
      escalated: false,
      messageMetadata: snapshot.messageMetadata,
      stagedEntries: previous.stagedEntries,
    });
  });

  it("replaces messages and clears per-turn state while retaining thread deltas", () => {
    const previous = {
      ...createAdkThreadState(),
      stateDelta: { retained: true },
      artifactDelta: { file: 1 },
      agentInfo: { name: "agent" },
      longRunningToolIds: ["tool-1"],
      toolConfirmations: [
        {
          toolCallId: "tool-1",
          toolName: "search",
          args: {},
          hint: "approve",
          confirmed: false,
        },
      ],
      authRequests: [{ toolCallId: "tool-2", authConfig: {} }],
      escalated: true,
      messageMetadata: new Map([["old", { usageMetadata: 1 }]]),
    };

    const next = reduceAdkThreadState(previous, {
      type: "messages.replaced",
      messages: [message],
    });

    expect(next.messages).toEqual([message]);
    expect(next.longRunningToolIds).toEqual([]);
    expect(next.toolConfirmations).toEqual([]);
    expect(next.authRequests).toEqual([]);
    expect(next.escalated).toBe(false);
    expect(next.messageMetadata.size).toBe(0);
    expect(next.stateDelta).toBe(previous.stateDelta);
    expect(next.artifactDelta).toBe(previous.artifactDelta);
    expect(next.agentInfo).toBe(previous.agentInfo);
  });

  it("recomputes a producing run's group when a later call appears", () => {
    const tool = (id: string): Extract<AdkMessage, { type: "tool" }> => ({
      id: `result-${id}`,
      type: "tool",
      name: "lookup",
      tool_call_id: id,
      content: id,
    });
    const call = (id: string): AdkMessage => ({
      id: `message-${id}`,
      type: "ai",
      content: "",
      tool_calls: [{ id, name: "lookup", args: {} }],
    });
    const started = reduceAdkThreadState(createAdkThreadState(), {
      type: "run.active",
    });
    expect(started.currentRunId).toBe("1");
    const firstCall = reduceAdkThreadState(started, {
      type: "messages.remember",
      messages: [call("c1")],
      runConfig: { model: "first" },
    });
    expect(firstCall.runConfigByToolCallId.get("c1")).toEqual({
      model: "first",
    });
    const firstAnswer = reduceAdkThreadState(
      {
        ...firstCall,
        messages: [call("c1")],
        longRunningToolIds: ["c1"],
      },
      { type: "results.received", message: tool("c1") },
    );
    expect(firstAnswer.readyBatch).toBeNull();
    expect(firstAnswer.toolResultBuffer.get("c1")).toEqual(tool("c1"));
    const laterCall = reduceAdkThreadState(firstAnswer, {
      type: "messages.remember",
      messages: [call("c3")],
      runConfig: undefined,
    });
    const secondAnswer = reduceAdkThreadState(
      {
        ...laterCall,
        messages: [call("c1"), call("c3")],
        longRunningToolIds: ["c1", "c3"],
      },
      { type: "results.received", message: tool("c3") },
    );
    const finished = reduceAdkThreadState(secondAnswer, {
      type: "run.finished",
      runId: "1",
    });
    const released = reduceAdkThreadState(finished, {
      type: "results.flush",
      runId: "1",
      failed: false,
    });
    expect(released.readyBatch).toEqual([tool("c1"), tool("c3")]);
    expect(released.toolResultBuffer.size).toBe(0);
    expect(firstAnswer.toolResultBuffer.size).toBe(1);
  });

  it("releases a run's answers without waiting for its interrupt calls", () => {
    const answer: Extract<AdkMessage, { type: "tool" }> = {
      id: "result-c1",
      type: "tool",
      name: "lookup",
      tool_call_id: "c1",
      content: "c1",
    };
    const calls: AdkMessage = {
      id: "message-1",
      type: "ai",
      content: "",
      tool_calls: [
        { id: "c1", name: "lookup", args: {} },
        { id: "confirm-1", name: "adk_request_confirmation", args: {} },
        { id: "auth-1", name: "adk_request_credential", args: {} },
        { id: "input-1", name: "adk_request_input", args: {} },
      ],
    };
    const started = reduceAdkThreadState(createAdkThreadState(), {
      type: "run.active",
    });
    const remembered = reduceAdkThreadState(started, {
      type: "messages.remember",
      messages: [calls],
      runConfig: undefined,
    });
    const finished = reduceAdkThreadState(
      {
        ...remembered,
        messages: [calls],
        longRunningToolIds: ["c1", "confirm-1", "auth-1", "input-1"],
      },
      { type: "run.finished", runId: "1" },
    );

    const released = reduceAdkThreadState(finished, {
      type: "results.received",
      message: answer,
    });

    expect(released.readyBatch).toEqual([answer]);
  });

  it("preserves known run configuration when seeding and prunes removed calls", () => {
    const call = (id: string): AdkMessage => ({
      id: `message-${id}`,
      type: "ai",
      content: "",
      tool_calls: [{ id, name: "lookup", args: {} }],
    });
    const remembered = reduceAdkThreadState(createAdkThreadState(), {
      type: "messages.remember",
      messages: [call("known")],
      runConfig: { model: "known" },
    });
    const seeded = reduceAdkThreadState(remembered, {
      type: "messages.seed",
      history: [call("known"), call("loaded")],
    });
    expect(seeded.runConfigByToolCallId.get("known")).toEqual({
      model: "known",
    });
    expect(seeded.runConfigByToolCallId.has("loaded")).toBe(true);
    expect(seeded.runConfigByToolCallId.get("loaded")).toBeUndefined();
    const singleton = reduceAdkThreadState(
      {
        ...seeded,
        messages: [call("known"), call("loaded")],
        longRunningToolIds: ["known", "loaded"],
      },
      {
        type: "results.received",
        message: {
          id: "result-loaded",
          type: "tool",
          name: "lookup",
          tool_call_id: "loaded",
          content: "ok",
        },
      },
    );
    expect(singleton.readyBatch?.map((result) => result.tool_call_id)).toEqual([
      "loaded",
    ]);
    const replayed = reduceAdkThreadState(
      reduceAdkThreadState(seeded, { type: "run.active" }),
      {
        type: "messages.remember",
        messages: [call("loaded")],
        runConfig: { model: "new" },
      },
    );
    expect(replayed.runIdByToolCallId.has("loaded")).toBe(false);
    const pruned = reduceAdkThreadState(seeded, {
      type: "messages.prune",
      history: [call("loaded")],
    });
    expect([...pruned.runConfigByToolCallId.keys()]).toEqual(["loaded"]);
  });

  it("holds a failed run's answers until their group completes or a new turn starts", () => {
    const answer = (id: string): Extract<AdkMessage, { type: "tool" }> => ({
      id: `answer-${id}`,
      type: "tool",
      name: "lookup",
      tool_call_id: id,
      content: id,
    });
    const initial = {
      ...createAdkThreadState(),
      messages: [
        {
          id: "call",
          type: "ai" as const,
          content: "",
          tool_calls: [
            { id: "c1", name: "lookup", args: {} },
            { id: "c2", name: "lookup", args: {} },
          ],
        },
      ],
      longRunningToolIds: ["c1", "c2"],
      runIdByToolCallId: new Map([
        ["c1", "1"],
        ["c2", "1"],
      ]),
      toolResultBuffer: new Map([["c1", answer("c1")]]),
      failedRunIds: new Set(["1"]),
    };
    const failed = reduceAdkThreadState(initial, {
      type: "results.flush",
      runId: "1",
      failed: true,
    });
    expect(failed.readyBatch).toBeNull();
    expect(failed.toolResultBuffer.size).toBe(1);
    expect(
      reduceAdkThreadState(failed, {
        type: "results.received",
        message: answer("c2"),
      }).readyBatch,
    ).toEqual([answer("c1"), answer("c2")]);

    const turn = reduceAdkThreadState(failed, { type: "run.newTurn" });
    expect(turn.readyBatch).toEqual([answer("c1")]);
    expect(turn.toolResultBuffer.size).toBe(0);
    expect(turn.failedRunIds.size).toBe(0);
  });

  it("clears held answers on cancellation, reload and snapshot", () => {
    const held = reduceAdkThreadState(
      {
        ...createAdkThreadState(),
        toolResultBuffer: new Map([
          [
            "c1",
            {
              id: "answer",
              type: "tool" as const,
              name: "lookup",
              tool_call_id: "c1",
              content: "ok",
            },
          ],
        ]),
      },
      { type: "run.active" },
    );
    expect(held.activeRunIds.size).toBe(1);

    const cancelled = reduceAdkThreadState(held, { type: "run.cancelled" });
    expect(cancelled.toolResultBuffer.size).toBe(0);
    expect(cancelled.activeRunIds.size).toBe(0);
    expect(
      reduceAdkThreadState(held, { type: "results.clear" }).toolResultBuffer
        .size,
    ).toBe(0);
    expect(
      reduceAdkThreadState(held, {
        type: "snapshot.applied",
        snapshot: { messages: [] },
      }).toolResultBuffer.size,
    ).toBe(0);
    expect(
      reduceAdkThreadState(held, {
        type: "messages.replaced",
        messages: [],
      }).toolResultBuffer.size,
    ).toBe(0);
  });

  it("groups calls loaded without a run by their assistant message", () => {
    const answer = (id: string): Extract<AdkMessage, { type: "tool" }> => ({
      id: `answer-${id}`,
      type: "tool",
      name: "lookup",
      tool_call_id: id,
      content: id,
    });
    const loaded = {
      ...createAdkThreadState(),
      messages: [
        {
          id: "call",
          type: "ai" as const,
          content: "",
          tool_calls: [
            { id: "c1", name: "lookup", args: {} },
            { id: "c2", name: "lookup", args: {} },
          ],
        },
      ],
      longRunningToolIds: ["c1", "c2"],
    };

    const first = reduceAdkThreadState(loaded, {
      type: "results.received",
      message: answer("c1"),
    });
    expect(first.readyBatch).toBeNull();
    expect(
      reduceAdkThreadState(first, {
        type: "results.received",
        message: answer("c2"),
      }).readyBatch,
    ).toEqual([answer("c1"), answer("c2")]);
  });

  it("releases an interrupt answer without waiting for its run's client calls", () => {
    const answer: Extract<AdkMessage, { type: "tool" }> = {
      id: "answer-input",
      type: "tool",
      name: "adk_request_input",
      tool_call_id: "input-1",
      content: "{}",
    };
    const state = {
      ...createAdkThreadState(),
      messages: [
        {
          id: "call",
          type: "ai" as const,
          content: "",
          tool_calls: [
            { id: "c1", name: "lookup", args: {} },
            { id: "input-1", name: "adk_request_input", args: {} },
          ],
        },
      ],
      longRunningToolIds: ["c1", "input-1"],
      runIdByToolCallId: new Map([
        ["c1", "1"],
        ["input-1", "1"],
      ]),
    };

    expect(
      reduceAdkThreadState(state, { type: "results.received", message: answer })
        .readyBatch,
    ).toEqual([answer]);
  });

  it("releases every complete group of an ended run when it flushes", () => {
    const answer = (
      id: string,
      name = "lookup",
    ): Extract<AdkMessage, { type: "tool" }> => ({
      id: `answer-${id}`,
      type: "tool",
      name,
      tool_call_id: id,
      content: id,
    });
    const calls: AdkMessage = {
      id: "call",
      type: "ai",
      content: "",
      tool_calls: [
        { id: "c1", name: "lookup", args: {} },
        { id: "c2", name: "lookup", args: {} },
        { id: "input-1", name: "adk_request_input", args: {} },
      ],
    };
    let state = reduceAdkThreadState(createAdkThreadState(), {
      type: "run.active",
    });
    state = reduceAdkThreadState(state, {
      type: "messages.remember",
      messages: [calls],
      runConfig: undefined,
    });
    state = {
      ...state,
      messages: [calls],
      longRunningToolIds: ["c1", "c2", "input-1"],
    };
    for (const message of [
      answer("input-1", "adk_request_input"),
      answer("c1"),
      answer("c2"),
    ]) {
      state = reduceAdkThreadState(state, {
        type: "results.received",
        message,
      });
      expect(state.readyBatch).toBeNull();
    }
    state = reduceAdkThreadState(state, { type: "run.finished", runId: "1" });

    const released = reduceAdkThreadState(state, {
      type: "results.flush",
      runId: "1",
      failed: false,
    });
    expect(released.readyBatch).toEqual([
      answer("input-1", "adk_request_input"),
      answer("c1"),
      answer("c2"),
    ]);
    expect(released.toolResultBuffer.size).toBe(0);
  });

  it("marks only the current run failed and skips calls it already knows", () => {
    const idle = createAdkThreadState();
    expect(reduceAdkThreadState(idle, { type: "run.failed" })).toBe(idle);
    const failed = reduceAdkThreadState(
      reduceAdkThreadState(idle, { type: "run.active" }),
      { type: "run.failed" },
    );
    expect([...failed.failedRunIds]).toEqual(["1"]);

    const call: AdkMessage = {
      id: "call",
      type: "ai",
      content: "",
      tool_calls: [{ id: "c1", name: "lookup", args: {} }],
    };
    const remembered = reduceAdkThreadState(failed, {
      type: "messages.remember",
      messages: [call],
      runConfig: undefined,
    });
    expect(remembered.runIdByToolCallId.get("c1")).toBe("1");
    expect(
      reduceAdkThreadState(remembered, {
        type: "messages.remember",
        messages: [call],
        runConfig: undefined,
      }),
    ).toBe(remembered);
  });

  it("restores the pre-event message and per-turn state", () => {
    const previousMessages: AdkMessage[] = [message];
    const optimisticMessage: AdkMessage = {
      id: "optimistic",
      type: "human",
      content: "pending",
    };
    const toolConfirmations = [
      {
        toolCallId: "confirmation",
        toolName: "approve",
        args: {},
        hint: "approval required",
        confirmed: false,
      },
    ];
    const authRequests = [
      { toolCallId: "auth", authConfig: { type: "oauth2" } },
    ];
    const previous = {
      ...createAdkThreadState(),
      messages: previousMessages,
      stateDelta: { retained: true },
      longRunningToolIds: ["pending-tool"],
      toolConfirmations,
      authRequests,
    };
    const started = reduceAdkThreadState(previous, {
      type: "run.started",
      messages: [...previousMessages, optimisticMessage],
      queuedMessageIds: [],
      longRunningToolIds: [],
      toolConfirmations: [],
      authRequests: [],
    });
    const restored = reduceAdkThreadState(started, {
      type: "run.preEventFailed",
      ownIds: [optimisticMessage.id],
      longRunningToolIds: previous.longRunningToolIds,
      toolConfirmations: previous.toolConfirmations,
      authRequests: previous.authRequests,
    });

    expect(restored).toMatchObject({
      messages: previousMessages,
      longRunningToolIds: ["pending-tool"],
      toolConfirmations,
      authRequests,
      stateDelta: { retained: true },
    });
  });

  it("keeps another group's queued message when the running group fails", () => {
    const running = { ...message, id: "running" };
    const queued = { ...message, id: "queued" };
    const initial = reduceAdkThreadState(createAdkThreadState(), {
      type: "messages.queued",
      messages: [running, queued],
      ids: [running.id, queued.id],
    });
    const started = reduceAdkThreadState(initial, {
      type: "run.started",
      messages: [running, queued],
      queuedMessageIds: [running.id],
      longRunningToolIds: [],
      toolConfirmations: [],
      authRequests: [],
    });
    const failed = reduceAdkThreadState(started, {
      type: "run.preEventFailed",
      ownIds: [running.id],
      longRunningToolIds: [],
      toolConfirmations: [],
      authRequests: [],
    });

    expect(failed.messages).toEqual([queued]);
    expect([...failed.queuedMessageIds]).toEqual([queued.id]);
  });
});
