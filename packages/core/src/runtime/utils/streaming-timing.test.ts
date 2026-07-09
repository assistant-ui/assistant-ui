import { describe, expect, it } from "vitest";
import {
  stepStreamingTiming,
  type StreamingTimingAccessors,
} from "./streaming-timing";

type TestMessage = {
  readonly id: string;
  readonly role: "assistant" | "user";
  readonly text: string;
  readonly toolCalls: number;
};

const accessors: StreamingTimingAccessors<TestMessage> = {
  getAssistantMessageId: (messages) => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]!.role === "assistant") return messages[i]!.id;
    }
    return undefined;
  },
  getTextLength: (messages, id) =>
    messages.find((m) => m.id === id)?.text.length ?? 0,
  getToolCallCount: (messages, id) =>
    messages.find((m) => m.id === id)?.toolCalls ?? 0,
};

const makeClock = () => {
  let t = 0;
  return () => (t += 10);
};

const msg = (id: string, text: string, toolCalls = 0): TestMessage => ({
  id,
  role: "assistant",
  text,
  toolCalls,
});

describe("stepStreamingTiming", () => {
  it("is idle when not running and there is no state", () => {
    const now = makeClock();
    expect(
      stepStreamingTiming(null, [], false, accessors, undefined, now),
    ).toEqual({ state: null, timings: {} });
  });

  it("starts tracking on the first running update and counts content growth as chunks", () => {
    const now = makeClock();
    const r1 = stepStreamingTiming(
      null,
      [msg("m1", "")],
      true,
      accessors,
      undefined,
      now,
    );
    // No growth yet (length 0), state is initialised but no chunks.
    expect(r1.timings).toEqual({});
    expect(r1.state).toMatchObject({ messageId: "m1", totalChunks: 0 });

    const r2 = stepStreamingTiming(
      r1.state,
      [msg("m1", "Hello")],
      true,
      accessors,
      undefined,
      now,
    );
    expect(r2.state).toMatchObject({
      messageId: "m1",
      totalChunks: 1,
      lastContentLength: 5,
      firstTokenTime: 10,
    });
    expect(r2.timings).toEqual({});
  });

  it("finalizes timing when streaming stops and counts the final chunk", () => {
    const now = makeClock();
    const r1 = stepStreamingTiming(
      null,
      [msg("m1", "a")],
      true,
      accessors,
      undefined,
      now,
    );
    const r2 = stepStreamingTiming(
      r1.state,
      [msg("m1", "ab")],
      true,
      accessors,
      undefined,
      now,
    );
    // Final content delta arrives in the SAME update as isRunning -> false.
    // The finalize re-reads the final length (3) rather than the last delta.
    const r3 = stepStreamingTiming(
      r2.state,
      [msg("m1", "abc")],
      false,
      accessors,
      undefined,
      now,
    );
    expect(r3.state).toBeNull();
    const timing = r3.timings["m1"]!;
    expect(timing).toBeDefined();
    // The final delta ("abc", arrived with the stop signal) is reconciled,
    // so totalChunks and tokenCount count the same three-character content.
    expect(timing.totalChunks).toBe(3);
    expect(timing.tokenCount).toBe(Math.ceil(3 / 4));
    expect(timing.toolCallCount).toBe(0);
    expect(timing.tokensPerSecond).toBeCloseTo(
      timing.tokenCount! / (timing.totalStreamTime! / 1000),
    );
  });

  it("reconciles totalChunks and tokenCount when the only growth lands at finalize", () => {
    const now = makeClock();
    // Running the whole time with empty content; the text arrives only with
    // the stop signal.
    const r1 = stepStreamingTiming(
      null,
      [msg("m1", "")],
      true,
      accessors,
      undefined,
      now,
    );
    const r2 = stepStreamingTiming(
      r1.state,
      [msg("m1", "done")],
      false,
      accessors,
      undefined,
      now,
    );
    const timing = r2.timings["m1"]!;
    expect(timing.totalChunks).toBe(1);
    expect(timing.tokenCount).toBe(Math.ceil(4 / 4));
    expect(timing.firstTokenTime).toBe(timing.totalStreamTime);
  });

  it("does not finalize while still running", () => {
    const now = makeClock();
    const r1 = stepStreamingTiming(
      null,
      [msg("m1", "content")],
      true,
      accessors,
      undefined,
      now,
    );
    const r2 = stepStreamingTiming(
      r1.state,
      [msg("m1", "content")],
      true,
      accessors,
      undefined,
      now,
    );
    expect(r2.timings).toEqual({});
    expect(r2.state).not.toBeNull();
  });

  it("resets tracking when the assistant message id changes mid-stream", () => {
    const now = makeClock();
    const r1 = stepStreamingTiming(
      null,
      [msg("m1", "hi")],
      true,
      accessors,
      undefined,
      now,
    );
    const r2 = stepStreamingTiming(
      r1.state,
      [msg("m1", "hi"), msg("m2", "")],
      true,
      accessors,
      undefined,
      now,
    );
    expect(r2.state?.messageId).toBe("m2");
    expect(r2.state?.totalChunks).toBe(0);
    expect(r2.state?.lastContentLength).toBe(0);
  });

  it("records firstTokenTime only once, at the first content growth", () => {
    const now = makeClock();
    const r1 = stepStreamingTiming(
      null,
      [msg("m1", "")],
      true,
      accessors,
      undefined,
      now,
    );
    const r2 = stepStreamingTiming(
      r1.state,
      [msg("m1", "first")],
      true,
      accessors,
      undefined,
      now,
    );
    expect(r2.state?.firstTokenTime).toBe(10);
    const r3 = stepStreamingTiming(
      r2.state,
      [msg("m1", "first second")],
      true,
      accessors,
      undefined,
      now,
    );
    // firstTokenTime unchanged on later growth.
    expect(r3.state?.firstTokenTime).toBe(10);
    expect(r3.state?.totalChunks).toBe(2);
  });

  it("counts tool calls from the final message", () => {
    const now = makeClock();
    const r1 = stepStreamingTiming(
      null,
      [msg("m1", "a", 2)],
      true,
      accessors,
      undefined,
      now,
    );
    const r2 = stepStreamingTiming(
      r1.state,
      [msg("m1", "ab", 2)],
      false,
      accessors,
      undefined,
      now,
    );
    expect(r2.timings["m1"]?.toolCallCount).toBe(2);
  });

  it("omits tokenCount and tokensPerSecond when the final text is empty", () => {
    const now = makeClock();
    const r1 = stepStreamingTiming(
      null,
      [msg("m1", "")],
      true,
      accessors,
      undefined,
      now,
    );
    const r2 = stepStreamingTiming(
      r1.state,
      [msg("m1", "")],
      false,
      accessors,
      undefined,
      now,
    );
    const timing = r2.timings["m1"]!;
    expect(timing.tokenCount).toBeUndefined();
    expect(timing.tokensPerSecond).toBeUndefined();
    expect(timing.totalChunks).toBe(0);
  });

  it("respects a custom estimateTokens option", () => {
    const now = makeClock();
    const r1 = stepStreamingTiming(
      null,
      [msg("m1", "abcdefgh")],
      true,
      accessors,
      { estimateTokens: (n) => Math.floor(n / 2) },
      now,
    );
    const r2 = stepStreamingTiming(
      r1.state,
      [msg("m1", "abcdefgh")],
      false,
      accessors,
      { estimateTokens: (n) => Math.floor(n / 2) },
      now,
    );
    expect(r2.timings["m1"]?.tokenCount).toBe(4);
  });

  it("produces no timings when running but no assistant message is present", () => {
    const now = makeClock();
    const r = stepStreamingTiming(
      null,
      [{ id: "u1", role: "user", text: "hi", toolCalls: 0 }],
      true,
      accessors,
      undefined,
      now,
    );
    expect(r.state).toBeNull();
    expect(r.timings).toEqual({});
  });
});
