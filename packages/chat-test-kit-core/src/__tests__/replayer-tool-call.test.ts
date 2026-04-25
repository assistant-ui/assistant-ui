import { describe, expect, it } from "vitest";

import { createHeadlessAdapter } from "../adapter/headless";
import { VirtualClock } from "../replayer/clock";
import { Replayer } from "../replayer/replayer";
import { transcript } from "../transcript/builder";

describe("Replayer tool calls", () => {
  it("emits tool-call event and tracks pendingToolCalls", async () => {
    const t = transcript()
      .assistantToolCall("get_stock_price", { ticker: "AAPL" })
      .toolResult({ price: 212.44 })
      .toJSON();
    const adapter = createHeadlessAdapter();
    const r = new Replayer({
      transcript: t,
      adapter,
      clock: new VirtualClock(),
    });

    await r.advanceToNextTurn();
    expect(r.state.pendingToolCalls).toEqual(["tc_1"]);

    await r.advanceToIdle();
    expect(r.state.pendingToolCalls).toEqual([]);
    expect(adapter.getSnapshot().events.map((event) => event.type)).toEqual([
      "tool-call",
      "tool-result",
    ]);
  });

  it("at idle with an unmatched tool call, replayer ends in error", async () => {
    const r = new Replayer({
      transcript: transcript().assistantToolCall("never_resolves", {}).toJSON(),
      adapter: createHeadlessAdapter(),
      clock: new VirtualClock(),
    });
    await r.advanceToIdle();
    expect(r.state.phase).toBe("error");
    expect(r.state.lastError?.message).toMatch(/unresolved tool call/i);
  });
});
