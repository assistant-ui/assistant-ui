import { describe, expect, it } from "vitest";
import type { LangChainMessage } from "./types";
import {
  createLangGraphThreadState,
  reduceLangGraphThreadState,
} from "./langGraphThreadState";

const call = (id: string) => ({ id, name: "tool", args: {} });
const ai = (id: string, toolIds: string[]): LangChainMessage => ({
  type: "ai",
  id,
  content: "",
  tool_calls: toolIds.map(call),
});
const tool = (id: string): LangChainMessage & { type: "tool" } => ({
  type: "tool",
  tool_call_id: id,
  name: "tool",
  content: id,
  status: "success",
});

describe("reduceLangGraphThreadState", () => {
  it("records new message and tool ownership without replacing existing owners", () => {
    const initial = createLangGraphThreadState();
    const started = reduceLangGraphThreadState(initial, {
      type: "run.started",
      messages: [],
    });
    const first = reduceLangGraphThreadState(started, {
      type: "messages.remember",
      messages: [ai("m", ["a"])],
      runConfig: "first",
    });
    const second = reduceLangGraphThreadState(first, {
      type: "messages.remember",
      messages: [ai("m", ["a", "b"])],
      runConfig: "second",
    });
    expect(initial.runConfigByMessageId.size).toBe(0);
    expect(first.runConfigByToolCallId.has("b")).toBe(false);
    expect(second.runConfigByMessageId.get("m")).toBe("first");
    expect(second.runConfigByToolCallId.get("b")).toBe("first");
    expect(second.runIdByMessageId.get("m")).toBe("1");
    expect(second.runIdByToolCallId.get("b")).toBe("1");
  });

  it("records chunk tool calls and seeds loaded ownership without a run ID", () => {
    const chunked = reduceLangGraphThreadState(createLangGraphThreadState(), {
      type: "messages.remember",
      messages: [
        {
          type: "AIMessageChunk",
          id: "chunk",
          tool_call_chunks: [{ index: 0, id: "chunk-tool", name: "tool" }],
        },
      ],
      runConfig: "chunk-config",
    });
    const seeded = reduceLangGraphThreadState(chunked, {
      type: "messages.seed",
      history: [ai("loaded", ["loaded-tool"]), ai("chunk", ["chunk-tool"])],
    });
    expect(seeded.runConfigByToolCallId.get("chunk-tool")).toBe("chunk-config");
    expect(seeded.runConfigByMessageId.get("loaded")).toBeUndefined();
    expect(seeded.runConfigByMessageId.has("loaded")).toBe(true);
    expect(seeded.runIdByToolCallId.has("loaded-tool")).toBe(false);
  });

  it("prunes ownership and run IDs only for removed messages and tools", () => {
    let state = reduceLangGraphThreadState(createLangGraphThreadState(), {
      type: "run.started",
      messages: [],
    });
    state = reduceLangGraphThreadState(state, {
      type: "messages.remember",
      messages: [ai("keep", ["a"]), ai("remove", ["b"])],
      runConfig: "owner",
    });
    const pruned = reduceLangGraphThreadState(state, {
      type: "messages.prune",
      history: [ai("keep", ["a"])],
    });
    expect([...pruned.runConfigByMessageId.keys()]).toEqual(["keep"]);
    expect([...pruned.runConfigByToolCallId.keys()]).toEqual(["a"]);
    expect([...pruned.runIdByMessageId.keys()]).toEqual(["keep"]);
    expect([...pruned.runIdByToolCallId.keys()]).toEqual(["a"]);
    expect(state.runConfigByMessageId.has("remove")).toBe(true);
  });

  it("tracks interrupt ownership and error balance across runs", () => {
    let state = reduceLangGraphThreadState(createLangGraphThreadState(), {
      type: "interrupt.set",
      runConfig: "resume",
    });
    state = reduceLangGraphThreadState(state, { type: "run.error", delta: 1 });
    state = reduceLangGraphThreadState(state, { type: "run.error", delta: -1 });
    expect(state.runErrorBalance).toBe(0);
    expect(state.interruptRunConfig).toBe("resume");
    state = reduceLangGraphThreadState(state, {
      type: "run.started",
      messages: [],
    });
    expect(state.runErrorBalance).toBe(0);
    expect(state.currentRunId).toBe("1");
    state = reduceLangGraphThreadState(state, {
      type: "run.finished",
      runId: "1",
    });
    expect(state.activeRunIds.size).toBe(0);
    expect(state.currentRunId).toBe("1");
  });

  it("merges sibling results into a queued resume without mutating its batch", () => {
    const queued = [tool("a")];
    let state = reduceLangGraphThreadState(createLangGraphThreadState(), {
      type: "resume.enqueue",
      groupKey: "run:1",
      batch: queued,
    });
    const before = state;
    state = reduceLangGraphThreadState(state, {
      type: "resume.enqueue",
      groupKey: "run:1",
      batch: [tool("b"), tool("a")],
    });
    state = reduceLangGraphThreadState(state, {
      type: "results.flush",
      runId: "1",
      expected: ["a", "b"],
      failed: false,
    });
    expect(queued).toEqual([tool("a")]);
    expect(before.pendingResume.get("run:1")?.messages).toEqual([tool("a")]);
    expect(state.pendingResume.get("run:1")?.messages).toEqual([
      tool("a"),
      tool("b"),
    ]);
    state = reduceLangGraphThreadState(state, {
      type: "run.started",
      messages: queued,
    });
    expect(state.startedMessages).toEqual([tool("a"), tool("b")]);
    expect(state.pendingResume.size).toBe(0);
    expect(state.pendingToolCallIdsByRun.has("1")).toBe(false);
    expect(state.nextRunId).toBe(1);
  });

  it("releases only the matching queued resume and clears dropped resumes", () => {
    const batch = [tool("a")];
    let state = reduceLangGraphThreadState(createLangGraphThreadState(), {
      type: "resume.enqueue",
      groupKey: "run:1",
      batch,
    });
    state = reduceLangGraphThreadState(state, {
      type: "resume.release",
      groupKey: "run:1",
      batch: [tool("a")],
    });
    expect(state.pendingResume.has("run:1")).toBe(true);
    state = reduceLangGraphThreadState(state, {
      type: "resume.release",
      groupKey: "run:1",
      batch,
    });
    expect(state.pendingResume.size).toBe(0);
    state = reduceLangGraphThreadState(state, {
      type: "resume.enqueue",
      groupKey: "run:2",
      batch,
    });
    expect(
      reduceLangGraphThreadState(state, { type: "resume.clear" }).pendingResume
        .size,
    ).toBe(0);
  });

  it("buffers parallel results and flushes them in pending call order", () => {
    let state = createLangGraphThreadState();
    state = reduceLangGraphThreadState(state, {
      type: "results.received",
      pendingCalls: [{ id: "a" }, { id: "b" }],
      message: tool("b"),
    });
    expect(state.readyBatch).toBeNull();
    expect(state.toolResultBuffer.has("b")).toBe(true);
    const buffered = state;
    state = reduceLangGraphThreadState(state, {
      type: "results.received",
      pendingCalls: [{ id: "a" }, { id: "b" }],
      message: tool("a"),
    });
    expect(state.readyBatch).toEqual([tool("a"), tool("b")]);
    expect(state.toolResultBuffer.size).toBe(0);
    expect(buffered.toolResultBuffer.has("b")).toBe(true);
  });

  it("holds active run results until completion and retains failed batches", () => {
    let state = reduceLangGraphThreadState(createLangGraphThreadState(), {
      type: "run.started",
      messages: [],
    });
    state = reduceLangGraphThreadState(state, {
      type: "results.buffer",
      message: tool("a"),
    });
    state = reduceLangGraphThreadState(state, {
      type: "results.flush",
      runId: "1",
      expected: ["a", "b"],
      failed: false,
    });
    expect(state.pendingToolCallIdsByRun.get("1")).toEqual(["a", "b"]);
    expect(state.readyBatch).toBeNull();
    state = reduceLangGraphThreadState(state, {
      type: "results.buffer",
      message: tool("b"),
    });
    const failed = reduceLangGraphThreadState(state, {
      type: "results.flush",
      runId: "1",
      expected: ["a", "b"],
      failed: true,
    });
    expect(failed.readyBatch).toBeNull();
    expect(failed.toolResultBuffer.size).toBe(2);
    const complete = reduceLangGraphThreadState(state, {
      type: "results.flush",
      runId: "1",
      expected: ["a", "b"],
      failed: false,
    });
    expect(complete.readyBatch).toEqual([tool("a"), tool("b")]);
    expect(complete.toolResultBuffer.size).toBe(0);
  });

  it("keeps unrelated buffered results when cancelling an active run", () => {
    let state = reduceLangGraphThreadState(createLangGraphThreadState(), {
      type: "run.started",
      messages: [],
    });
    state = reduceLangGraphThreadState(state, {
      type: "messages.remember",
      messages: [ai("m", ["active"])],
      runConfig: undefined,
    });
    state = reduceLangGraphThreadState(state, {
      type: "results.buffer",
      message: tool("active"),
    });
    state = reduceLangGraphThreadState(state, {
      type: "results.buffer",
      message: tool("other"),
    });
    state = reduceLangGraphThreadState(state, {
      type: "results.flush",
      runId: "1",
      expected: ["active", "missing"],
      failed: false,
    });
    state = reduceLangGraphThreadState(state, {
      type: "cancellations.add",
      messages: [tool("active")],
    });
    state = reduceLangGraphThreadState(state, {
      type: "resume.enqueue",
      groupKey: "run:1",
      batch: [tool("active")],
    });
    const cancelled = reduceLangGraphThreadState(state, {
      type: "run.cancelled",
    });
    expect([...cancelled.toolResultBuffer.keys()]).toEqual(["other"]);
    expect(cancelled.pendingToolCallIdsByRun.size).toBe(0);
    expect(cancelled.activeRunIds.size).toBe(0);
    expect(cancelled.pendingResume.size).toBe(0);
    expect(cancelled.autoCancelledToolCallTokens.size).toBe(0);
    expect(cancelled.currentRunId).toBe("1");
  });

  it("tracks cancellation tokens by identity and removes them on reconciliation", () => {
    const messages = [tool("a"), tool("b")];
    let state = reduceLangGraphThreadState(createLangGraphThreadState(), {
      type: "cancellations.add",
      messages,
    });
    state = reduceLangGraphThreadState(state, {
      type: "cancellations.remove",
      toolCallId: "a",
      token: [tool("a")],
    });
    expect(state.autoCancelledToolCallTokens.has("a")).toBe(true);
    state = reduceLangGraphThreadState(state, {
      type: "cancellations.remove",
      toolCallId: "a",
      token: messages,
    });
    expect(state.autoCancelledToolCallTokens.has("a")).toBe(false);
    state = reduceLangGraphThreadState(state, {
      type: "messages.reconciled",
      messages: [tool("b")],
    });
    expect(state.autoCancelledToolCallTokens.size).toBe(0);
  });

  it("clears a new turn, edit results, and initial load at their existing boundaries", () => {
    let state = reduceLangGraphThreadState(createLangGraphThreadState(), {
      type: "run.started",
      messages: [],
    });
    state = reduceLangGraphThreadState(state, {
      type: "messages.remember",
      messages: [ai("m", ["a"])],
      runConfig: "owner",
    });
    state = reduceLangGraphThreadState(state, {
      type: "results.buffer",
      message: tool("a"),
    });
    state = reduceLangGraphThreadState(state, {
      type: "interrupt.set",
      runConfig: "resume",
    });
    state = reduceLangGraphThreadState(state, {
      type: "resume.enqueue",
      groupKey: "run:1",
      batch: [tool("b")],
    });
    const turn = reduceLangGraphThreadState(state, { type: "run.newTurn" });
    expect(turn.toolResultBuffer.size).toBe(0);
    expect(turn.pendingResume.size).toBe(0);
    expect(turn.interruptRunConfig).toBeUndefined();
    expect(turn.runConfigByMessageId.get("m")).toBe("owner");
    const edit = reduceLangGraphThreadState(state, { type: "results.clear" });
    expect(edit.pendingResume.size).toBe(1);
    expect(edit.toolResultBuffer.size).toBe(0);
    const load = reduceLangGraphThreadState(state, { type: "run.initialLoad" });
    expect(load.runConfigByMessageId.size).toBe(0);
    expect(load.runIdByToolCallId.size).toBe(0);
    expect(load.activeRunIds.size).toBe(0);
    expect(load.pendingResume.size).toBe(1);
    expect(load.currentRunId).toBe("1");
    expect(load.nextRunId).toBe(1);
  });
});
