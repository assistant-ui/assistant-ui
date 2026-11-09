// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { AssistantTransportDecoder } from "assistant-stream";
import { SSEEventDecoder } from "assistant-stream/utils";

function trackScannedCodeUnits() {
  const exec = RegExp.prototype.exec;
  let scanned = 0;
  const scan = vi.spyOn(RegExp.prototype, "exec").mockImplementation(function (
    this: RegExp,
    text,
  ) {
    const start = this.lastIndex;
    const match = Reflect.apply(exec, this, [text]);
    if (this.source === "\\r\\n|\\r|\\n" && this.global) {
      // A global delimiter scan resumes at lastIndex. Count only the span
      // consumed by this search, including the unmatched remainder on failure.
      scanned += (match ? match.index + match[0].length : text.length) - start;
    }
    return match;
  });
  return { scanned: () => scanned, restore: () => scan.mockRestore() };
}

describe("SSE delimiter-scan input volume", () => {
  it.each([1, 128, 4096])(
    "scans each incoming code unit once with %i-character chunks",
    (chunkSize) => {
      const data = "x".repeat(4096);
      const wire = `data: ${data}\n\n`;
      const decoder = new SSEEventDecoder();
      const events = [];
      const scan = trackScannedCodeUnits();
      try {
        for (let i = 0; i < wire.length; i += chunkSize) {
          events.push(...decoder.push(wire.slice(i, i + chunkSize)));
        }
      } finally {
        scan.restore();
      }

      expect(events).toEqual([{ data }]);
      expect(scan.scanned()).toBe(wire.length);
    },
  );

  it("does not scan a same-chunk suffix after the terminal marker", async () => {
    const prefix = 'data: {"type":"data","data":[1]}\n\ndata: [DONE]\n\n';
    const wire = prefix + ": ignored\n".repeat(1000);
    const input = new ReadableStream<Uint8Array<ArrayBuffer>>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(wire));
        controller.close();
      },
    });
    const chunks = [];
    const scan = trackScannedCodeUnits();
    try {
      for await (const chunk of input.pipeThrough(
        new AssistantTransportDecoder(),
      )) {
        chunks.push(chunk);
      }
    } finally {
      scan.restore();
    }
    expect(chunks).toEqual([{ type: "data", data: [1], path: [] }]);
    expect(scan.scanned()).toBe(prefix.length);
  });
});
