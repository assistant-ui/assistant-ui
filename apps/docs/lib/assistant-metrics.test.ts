import { describe, expect, it } from "vitest";
import { getMessageTraceId } from "./assistant-metrics";

const TRACE_ID = "0123456789abcdef0123456789abcdef";

describe("getMessageTraceId", () => {
  it("reads the trace id the chat routes stream into message metadata", () => {
    expect(
      getMessageTraceId({ custom: { traceId: TRACE_ID, usage: {} } }),
    ).toBe(TRACE_ID);
  });

  it("ignores missing or malformed trace ids", () => {
    expect(getMessageTraceId(undefined)).toBeUndefined();
    expect(getMessageTraceId({ custom: {} })).toBeUndefined();
    expect(getMessageTraceId({ traceId: TRACE_ID })).toBeUndefined();
    expect(
      getMessageTraceId({ custom: { traceId: "not-a-trace" } }),
    ).toBeUndefined();
  });
});
