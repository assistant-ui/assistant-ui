import { describe, expect, it, vi } from "vitest";
import { SSEEventDecoder } from "assistant-stream/utils";

describe("SSE newline-split input volume", () => {
  it.each([1, 128, 4096])(
    "offers each incoming code unit to split once with %i-character chunks",
    (chunkSize) => {
      const data = "x".repeat(4096);
      const wire = `data: ${data}\n\n`;
      const decoder = new SSEEventDecoder();
      const events = [];
      const split = String.prototype.split;
      // A different scanning primitive needs its own work counter in this contract.
      let scanned = 0;
      const scan = vi
        .spyOn(String.prototype, "split")
        .mockImplementation(function (this: string, separator, limit) {
          scanned += this.length;
          return Reflect.apply(split, this, [separator, limit]);
        });
      try {
        for (let i = 0; i < wire.length; i += chunkSize) {
          events.push(...decoder.push(wire.slice(i, i + chunkSize)));
        }
      } finally {
        scan.mockRestore();
      }

      expect(events).toEqual([{ data }]);
      expect(scanned).toBe(wire.length);
    },
  );
});
