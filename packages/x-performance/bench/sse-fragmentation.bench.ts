import { describe, test } from "vitest";
import { SSEEventDecoder } from "assistant-stream/utils";

describe("assistant-stream: fragmented SSE events", () => {
  for (const size of [100 * 1024, 1024 * 1024]) {
    const wire = `data: ${JSON.stringify({ content: "x".repeat(size) })}\n\n`;
    for (const chunkSize of [1024, wire.length]) {
      const chunks = [];
      for (let i = 0; i < wire.length; i += chunkSize) {
        chunks.push(wire.slice(i, i + chunkSize));
      }
      const name = `${size / 1024} KiB, ${chunks.length} chunks`;
      test(name, async ({ bench }) => {
        await bench(name, () => {
          const decoder = new SSEEventDecoder();
          for (const chunk of chunks) decoder.push(chunk);
        }).run();
      });
    }
  }
});
