import { describe, expect, it } from "vitest";
import { LineDecoderStream } from "./LineDecoderStream";

async function collectLines(stream: ReadableStream<string>): Promise<string[]> {
  const reader = stream.getReader();
  const lines: string[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    lines.push(value);
  }
  return lines;
}

function createTextStream(chunks: string[]): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

describe("LineDecoderStream", () => {
  it("should split lines on LF (\\n)", async () => {
    const stream = createTextStream(["line1\nline2\nline3\n"]);
    const lines = await collectLines(
      stream.pipeThrough(new LineDecoderStream()),
    );
    expect(lines).toEqual(["line1", "line2", "line3"]);
  });

  it("should split lines on CRLF (\\r\\n)", async () => {
    const stream = createTextStream(["line1\r\nline2\r\nline3\r\n"]);
    const lines = await collectLines(
      stream.pipeThrough(new LineDecoderStream()),
    );
    expect(lines).toEqual(["line1", "line2", "line3"]);
  });

  it("should handle CRLF split across chunks", async () => {
    // The \r is at the end of one chunk and \n at the start of the next
    const stream = createTextStream(["line1\r", "\nline2\r\n"]);
    const lines = await collectLines(
      stream.pipeThrough(new LineDecoderStream()),
    );
    expect(lines).toEqual(["line1", "line2"]);
  });

  it("should handle empty lines with LF", async () => {
    const stream = createTextStream(["line1\n\nline2\n"]);
    const lines = await collectLines(
      stream.pipeThrough(new LineDecoderStream()),
    );
    expect(lines).toEqual(["line1", "", "line2"]);
  });

  it("should handle empty lines with CRLF", async () => {
    const stream = createTextStream(["line1\r\n\r\nline2\r\n"]);
    const lines = await collectLines(
      stream.pipeThrough(new LineDecoderStream()),
    );
    expect(lines).toEqual(["line1", "", "line2"]);
  });

  it("should handle mixed LF and CRLF", async () => {
    const stream = createTextStream(["line1\nline2\r\nline3\n"]);
    const lines = await collectLines(
      stream.pipeThrough(new LineDecoderStream()),
    );
    expect(lines).toEqual(["line1", "line2", "line3"]);
  });

  it("should handle multiple chunks", async () => {
    const stream = createTextStream(["li", "ne1\nli", "ne2\n"]);
    const lines = await collectLines(
      stream.pipeThrough(new LineDecoderStream()),
    );
    expect(lines).toEqual(["line1", "line2"]);
  });

  it("should throw on incomplete line at end of stream", async () => {
    const stream = createTextStream(["line1\nincomplete"]);
    await expect(
      collectLines(stream.pipeThrough(new LineDecoderStream())),
    ).rejects.toThrow("Stream ended with an incomplete line");
  });

  it("should handle SSE-like data with CRLF", async () => {
    const sseData = 'data: {"type":"text"}\r\n\r\ndata: [DONE]\r\n\r\n';
    const stream = createTextStream([sseData]);
    const lines = await collectLines(
      stream.pipeThrough(new LineDecoderStream()),
    );
    expect(lines).toEqual(['data: {"type":"text"}', "", "data: [DONE]", ""]);
  });
});
