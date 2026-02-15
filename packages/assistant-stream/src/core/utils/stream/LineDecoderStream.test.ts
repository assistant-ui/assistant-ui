import { describe, expect, it } from "vitest";
import { LineDecoderStream } from "./LineDecoderStream";

async function collectLines(stream: ReadableStream<string>): Promise<string[]> {
  const reader = stream.getReader();
  const lines: string[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      lines.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return lines;
}

describe("LineDecoderStream", () => {
  it("throws on trailing partial lines in strict mode", async () => {
    const input = new ReadableStream<string>({
      start(controller) {
        controller.enqueue("ok\npartial");
        controller.close();
      },
    });

    await expect(
      collectLines(input.pipeThrough(new LineDecoderStream())),
    ).rejects.toThrow('Stream ended with an incomplete line: "partial"');
  });

  it("ignores trailing partial lines when configured to be lenient", async () => {
    const input = new ReadableStream<string>({
      start(controller) {
        controller.enqueue("line-1\nline-2\npartial");
        controller.close();
      },
    });

    const lines = await collectLines(
      input.pipeThrough(
        new LineDecoderStream({ allowIncompleteLineOnFlush: true }),
      ),
    );

    expect(lines).toEqual(["line-1", "line-2"]);
  });
});
