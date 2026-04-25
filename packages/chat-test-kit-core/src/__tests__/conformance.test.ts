import { describe, expect, it } from "vitest";

import {
  createHeadlessAdapter,
  Replayer,
  transcript,
  Transcript,
  VirtualClock,
} from "../index";

describe("format conformance via headless adapter", () => {
  it("happy path: user to tool-call to tool-result to stream to finish", async () => {
    const parsed = Transcript.fromJSON(
      transcript()
        .user("Check AAPL")
        .assistantToolCall("get_stock_price", { ticker: "AAPL" })
        .toolResult({ price: 212.44 })
        .assistantStream("AAPL is at $212.44.", {
          chunks: ["AAPL is ", "at $212.44."],
          interChunkDelayMs: 20,
          finish: { reason: "stop" },
        })
        .toJSON(),
    );
    const adapter = createHeadlessAdapter();
    const clock = new VirtualClock();
    const r = new Replayer({ transcript: parsed, adapter, clock });

    await r.advanceToIdle();

    expect(r.state.phase).toBe("complete");
    expect(clock.now()).toBe(20);
    expect(adapter.getSnapshot().events.map((event) => event.type)).toEqual([
      "tool-call",
      "tool-result",
      "text-delta",
      "text-delta",
      "finish",
    ]);
  });

  it("disconnect mid-stream", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: Transcript.fromJSON(
        transcript()
          .assistantStream("ab", { chunks: ["a", "b"] })
          .inject.disconnect({ afterChunk: 0 })
          .toJSON(),
      ),
      adapter,
      clock: new VirtualClock(),
    });
    await r.advanceToIdle();
    expect(r.state.phase).toBe("error");
    expect(adapter.getSnapshot().events.map((event) => event.type)).toEqual([
      "text-delta",
      "disconnect",
    ]);
  });

  it("transport error before stream", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: Transcript.fromJSON(
        transcript()
          .user("hi")
          .assistantStream("never")
          .inject.transportError({ code: 503, message: "unavailable" })
          .toJSON(),
      ),
      adapter,
      clock: new VirtualClock(),
    });
    await r.advanceToIdle();
    expect(r.state.phase).toBe("error");
    expect(r.state.lastError).toEqual({ code: 503, message: "unavailable" });
  });

  it("cancel injection at a turn", async () => {
    const r = new Replayer({
      transcript: Transcript.fromJSON(
        transcript()
          .user("hi")
          .assistantStream("hello")
          .inject.cancel()
          .toJSON(),
      ),
      adapter: createHeadlessAdapter(),
      clock: new VirtualClock(),
    });
    await r.advanceToIdle();
    expect(r.state.phase).toBe("cancelled");
  });

  it("abortAndRestart re-runs the transcript once", async () => {
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: Transcript.fromJSON(
        transcript()
          .user("hi")
          .assistantStream("nope", { chunks: ["no", "pe"] })
          .inject.abortAndRestart()
          .toJSON(),
      ),
      adapter,
      clock: new VirtualClock(),
    });
    await r.advanceToIdle();
    expect(adapter.getSnapshot().abortCount).toBe(1);
    expect(adapter.getSnapshot().userMessages).toHaveLength(2);
  });
});
