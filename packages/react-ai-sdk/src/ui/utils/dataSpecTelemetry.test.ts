import { describe, expect, it, vi } from "vitest";
import type { AISDKDataSpecTelemetryEvent } from "./convertMessage";
import { createAISDKDataSpecTelemetrySink } from "./dataSpecTelemetry";

describe("createAISDKDataSpecTelemetrySink", () => {
  it("counts stale seq and malformed patch events", () => {
    const sink = createAISDKDataSpecTelemetrySink();

    sink.onTelemetry({
      type: "stale-seq-ignored",
      instanceId: "spec_1",
      seq: 1,
      latestSeq: 2,
    });
    sink.onTelemetry({
      type: "malformed-patch-dropped",
      instanceId: "spec_1",
      seq: 3,
    });

    expect(sink.getCounters()).toEqual({
      staleSeqIgnored: 1,
      malformedPatchDropped: 1,
    });
  });

  it("forwards events with current counters", () => {
    const onEvent = vi.fn();
    const sink = createAISDKDataSpecTelemetrySink({ onEvent });

    const event: AISDKDataSpecTelemetryEvent = {
      type: "stale-seq-ignored",
      instanceId: "spec_2",
      seq: 4,
      latestSeq: 7,
    };

    sink.onTelemetry(event);

    expect(onEvent).toHaveBeenCalledWith(
      event,
      expect.objectContaining({
        staleSeqIgnored: 1,
        malformedPatchDropped: 0,
      }),
    );
  });

  it("resets counters", () => {
    const sink = createAISDKDataSpecTelemetrySink();

    sink.onTelemetry({
      type: "malformed-patch-dropped",
      instanceId: "spec_1",
    });
    sink.reset();

    expect(sink.getCounters()).toEqual({
      staleSeqIgnored: 0,
      malformedPatchDropped: 0,
    });
  });
});
