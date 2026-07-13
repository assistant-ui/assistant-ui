import { describe, expect, it } from "vitest";
import { SSEEventDecoder } from "./SSEEventDecoder";

describe("SSEEventDecoder", () => {
  it("decodes LF terminated events", () => {
    const decoder = new SSEEventDecoder();
    expect(decoder.push("data: x\n\n")).toEqual([{ data: "x" }]);
  });

  it("decodes CRLF terminated events", () => {
    const decoder = new SSEEventDecoder();
    expect(decoder.push("data: x\r\n\r\n")).toEqual([{ data: "x" }]);
  });

  it("decodes CR terminated events", () => {
    const decoder = new SSEEventDecoder();
    expect(decoder.push("data: x\r\r")).toEqual([{ data: "x" }]);
  });

  it("handles CRLF split across pushes", () => {
    const decoder = new SSEEventDecoder();
    expect(decoder.push("data: x\r")).toEqual([]);
    expect(decoder.push("\n\r\n")).toEqual([{ data: "x" }]);
  });

  it("handles CR terminated lines split across pushes", () => {
    const decoder = new SSEEventDecoder();
    expect(decoder.push("data: x\r")).toEqual([]);
    expect(decoder.push("\r")).toEqual([{ data: "x" }]);
  });

  it("decodes multiple events in one push", () => {
    const decoder = new SSEEventDecoder();
    expect(decoder.push("data: first\n\ndata: second\n\n")).toEqual([
      { data: "first" },
      { data: "second" },
    ]);
  });

  it("joins multiple data lines with a newline", () => {
    const decoder = new SSEEventDecoder();
    expect(decoder.push("data: first\ndata: second\n\n")).toEqual([
      { data: "first\nsecond" },
    ]);
  });

  it("preserves data values without a space after the colon", () => {
    const decoder = new SSEEventDecoder();
    expect(decoder.push("data:x\n\n")).toEqual([{ data: "x" }]);
  });

  it("skips comment lines", () => {
    const decoder = new SSEEventDecoder();
    expect(decoder.push(": heartbeat\ndata: x\n\n")).toEqual([{ data: "x" }]);
  });

  it("captures event fields and clears them after dispatch", () => {
    const decoder = new SSEEventDecoder();
    expect(
      decoder.push("event: update\ndata: first\n\ndata: second\n\n"),
    ).toEqual([{ event: "update", data: "first" }, { data: "second" }]);
  });

  it("persists IDs across frames", () => {
    const decoder = new SSEEventDecoder();
    expect(decoder.push("id: 1\ndata: first\n\ndata: second\n\n")).toEqual([
      { data: "first", id: "1" },
      { data: "second", id: "1" },
    ]);
  });

  it("parses numeric retries and ignores non-numeric retries", () => {
    const decoder = new SSEEventDecoder();
    expect(
      decoder.push(
        "retry: 1000\ndata: first\n\nretry: invalid\ndata: second\n\n",
      ),
    ).toEqual([
      { data: "first", retry: 1000 },
      { data: "second", retry: 1000 },
    ]);
  });

  it("ignores ids containing NUL and keeps ids containing spaces", () => {
    const decoder = new SSEEventDecoder();
    expect(
      decoder.push(
        "id: ok\ndata: a\n\nid: bad\u0000id\ndata: b\n\nid: spaced id\ndata: c\n\n",
      ),
    ).toEqual([
      { data: "a", id: "ok" },
      { data: "b", id: "ok" },
      { data: "c", id: "spaced id" },
    ]);
  });

  it("ignores non-digit retry values", () => {
    const decoder = new SSEEventDecoder();
    expect(
      decoder.push(
        "retry: 1000\ndata: a\n\nretry: -1\ndata: b\n\nretry: 1.5\ndata: c\n\nretry: 1e3\ndata: d\n\nretry:\ndata: e\n\n",
      ),
    ).toEqual([
      { data: "a", retry: 1000 },
      { data: "b", retry: 1000 },
      { data: "c", retry: 1000 },
      { data: "d", retry: 1000 },
      { data: "e", retry: 1000 },
    ]);
  });

  it("does not dispatch blank frames", () => {
    const decoder = new SSEEventDecoder();
    expect(decoder.push("event: update\n\ndata: x\n\n")).toEqual([
      { data: "x" },
    ]);
  });

  it("preserves a pending LF across empty pushes", () => {
    const decoder = new SSEEventDecoder();
    expect(decoder.push("data: x\r")).toEqual([]);
    expect(decoder.push("")).toEqual([]);
    expect(decoder.push("\n\r\n")).toEqual([{ data: "x" }]);
  });

  it("drops unterminated trailing data by default", () => {
    const decoder = new SSEEventDecoder();
    expect(decoder.push("data: x")).toEqual([]);
    expect(decoder.flush()).toBeNull();
  });

  it("dispatches an unterminated final data line when configured", () => {
    const decoder = new SSEEventDecoder({ trailing: "dispatch" });
    expect(decoder.push("data: x")).toEqual([]);
    expect(decoder.flush()).toEqual({ data: "x" });
  });

  it("makes flush idempotent", () => {
    const decoder = new SSEEventDecoder({ trailing: "dispatch" });
    decoder.push("data: x");
    expect(decoder.flush()).toEqual({ data: "x" });
    expect(decoder.flush()).toBeNull();
  });
});
