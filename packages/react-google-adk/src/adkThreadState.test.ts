import { describe, expect, it } from "vitest";
import { createAdkThreadState, reduceAdkThreadState } from "./adkThreadState";
import type { AdkMessage } from "./types";

const message: AdkMessage = {
  id: "message-1",
  type: "human",
  content: "hello",
};

describe("reduceAdkThreadState", () => {
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

  it("releases every complete group of a run when it ends", () => {
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
});
