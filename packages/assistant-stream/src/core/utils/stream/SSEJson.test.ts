import { describe, expect, it, vi } from "vitest";
import { createSSEJsonDecoder, createSSEJsonEncoder } from "./SSEJson";

async function collectChunks<T>(stream: ReadableStream<T>): Promise<T[]> {
  const reader = stream.getReader();
  const chunks: T[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return chunks;
}

function fromValues<T>(values: T[]): ReadableStream<T> {
  return new ReadableStream<T>({
    start(controller) {
      for (const value of values) controller.enqueue(value);
      controller.close();
    },
  });
}

function fromSSEText(text: string): ReadableStream<Uint8Array<ArrayBuffer>> {
  return fromValues([new TextEncoder().encode(text)]) as ReadableStream<
    Uint8Array<ArrayBuffer>
  >;
}

const jsonParse = (
  data: string,
  controller: TransformStreamDefaultController<unknown>,
) => {
  controller.enqueue(JSON.parse(data));
};

describe("createSSEJsonEncoder", () => {
  it("frames each chunk as an sse data line", async () => {
    const encoded = await collectChunks(
      createSSEJsonEncoder()(fromValues([{ a: 1 }, { b: 2 }])),
    );
    const text = new TextDecoder().decode(
      encoded.reduce(
        (acc, part) => new Uint8Array([...acc, ...part]),
        new Uint8Array(),
      ),
    );
    expect(text).toBe('data: {"a":1}\n\ndata: {"b":2}\n\n');
  });

  it("appends the done marker on flush when configured", async () => {
    const encoded = await collectChunks(
      createSSEJsonEncoder("[DONE]")(fromValues([{ a: 1 }])),
    );
    const text = new TextDecoder().decode(
      encoded.reduce(
        (acc, part) => new Uint8Array([...acc, ...part]),
        new Uint8Array(),
      ),
    );
    expect(text).toBe('data: {"a":1}\n\ndata: [DONE]\n\n');
  });
});

describe("createSSEJsonDecoder", () => {
  it.each(["", "\uFEFF"])(
    "decodes a stream with %j as its BOM prefix",
    async (prefix) => {
      const chunks = await collectChunks(
        createSSEJsonDecoder({ parse: jsonParse })(
          fromSSEText(`${prefix}data: {"a":1}\n\n`),
        ),
      );
      expect(chunks).toEqual([{ a: 1 }]);
    },
  );

  it.each([0, 1, 2, 3, 4, 5, 6])(
    "ignores a field prefixed by a second BOM when bytes split at %i",
    async (split) => {
      const bytes = new TextEncoder().encode(
        '\uFEFF\uFEFFdata: {"ignored":true}\ndata: {"a":1}\n\n',
      );
      const chunks = await collectChunks(
        createSSEJsonDecoder({ parse: jsonParse })(
          fromValues([bytes.slice(0, split), bytes.slice(split)]),
        ),
      );
      expect(chunks).toEqual([{ a: 1 }]);
    },
  );

  it("preserves a BOM inside a JSON string", async () => {
    const chunks = await collectChunks(
      createSSEJsonDecoder({ parse: jsonParse })(
        fromSSEText('data: {"text":"\uFEFFkept"}\n\n'),
      ),
    );
    expect(chunks).toEqual([{ text: "\uFEFFkept" }]);
  });

  it("parses message events and terminates on the done marker", async () => {
    const chunks = await collectChunks(
      createSSEJsonDecoder({
        parse: jsonParse,
        done: { marker: "[DONE]" },
      })(fromSSEText('data: {"a":1}\n\ndata: [DONE]\n\ndata: {"b":2}\n\n')),
    );
    expect(chunks).toEqual([{ a: 1 }]);
  });

  it("invokes the done callback when the marker arrives", async () => {
    const onDone = vi.fn();
    await collectChunks(
      createSSEJsonDecoder({
        parse: jsonParse,
        done: { marker: "[DONE]", onDone },
      })(fromSSEText('data: {"a":1}\n\ndata: [DONE]\n\n')),
    );
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("invokes the missing callback when the stream ends without the marker", async () => {
    const onMissing = vi.fn();
    await collectChunks(
      createSSEJsonDecoder({
        parse: jsonParse,
        done: { marker: "[DONE]", onMissing },
      })(fromSSEText('data: {"a":1}\n\n')),
    );
    expect(onMissing).toHaveBeenCalledOnce();
  });

  it("throws on unknown event names in strict mode", async () => {
    await expect(
      collectChunks(
        createSSEJsonDecoder({
          parse: jsonParse,
          strict: true,
        })(fromSSEText('event: custom\ndata: {"a":1}\n\n')),
      ),
    ).rejects.toThrow("Unknown SSE event type: custom");
  });

  it("reports unknown event names through the lenient callback", async () => {
    const onUnknownEvent = vi.fn();
    const chunks = await collectChunks(
      createSSEJsonDecoder({
        parse: jsonParse,
        strict: false,
        onUnknownEvent,
      })(fromSSEText('event: custom\ndata: {"a":1}\n\ndata: {"b":2}\n\n')),
    );
    expect(chunks).toEqual([{ b: 2 }]);
    expect(onUnknownEvent).toHaveBeenCalledExactlyOnceWith("custom");
  });
});
