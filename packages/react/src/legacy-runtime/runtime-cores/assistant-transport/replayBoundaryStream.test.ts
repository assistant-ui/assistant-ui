import {
  AssistantMessageAccumulator,
  DataStreamDecoder,
} from "assistant-stream";
import { describe, expect, it, vi } from "vitest";
import {
  createReplayBoundaryStream,
  REPLAY_CONTENT_LENGTH_HEADER,
} from "./replayBoundaryStream";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const createBody = (chunks: readonly string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

const createResponse = (
  chunks: readonly string[],
  replayContentLength?: number | string,
) =>
  new Response(createBody(chunks), {
    headers:
      replayContentLength === undefined
        ? undefined
        : { [REPLAY_CONTENT_LENGTH_HEADER]: String(replayContentLength) },
  });

const createRenderWait = () => {
  const pending: Array<() => void> = [];
  const waitForRender = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        pending.push(resolve);
      }),
  );

  const releaseNext = async () => {
    for (let i = 0; pending.length === 0 && i < 10; i++) {
      await Promise.resolve();
    }

    const resolve = pending.shift();
    expect(resolve).toBeDefined();
    resolve!();
    await Promise.resolve();
  };

  return { waitForRender, releaseNext };
};

const readText = async (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader();
  const chunks: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(decoder.decode(value, { stream: true }));
  }
  chunks.push(decoder.decode());

  return chunks.join("");
};

describe("createReplayBoundaryStream", () => {
  it("short-circuits responses without a valid replay content length", async () => {
    const setReplaying = vi.fn();
    const waitForRender = vi.fn();

    for (const replayContentLength of [undefined, "abc", "3.5", "-1"]) {
      setReplaying.mockClear();
      waitForRender.mockClear();

      const body = await createReplayBoundaryStream(
        createResponse(["live"], replayContentLength),
        {
          setReplaying,
          waitForRender,
        },
      );

      expect(await readText(body)).toBe("live");
      expect(setReplaying).not.toHaveBeenCalled();
      expect(waitForRender).not.toHaveBeenCalled();
    }
  });

  it("pauses at the replay boundary before releasing live bytes", async () => {
    const { waitForRender, releaseNext } = createRenderWait();
    const setReplaying = vi.fn();
    const replayPrefix = '0:"hi"\nb:{"toolCallId":"call-1","toolName":"te';
    const liveSuffix = 'st"}\n';
    const replayContentLength = encoder.encode(replayPrefix).byteLength;

    const streamPromise = createReplayBoundaryStream(
      createResponse([replayPrefix + liveSuffix], replayContentLength),
      { setReplaying, waitForRender },
    );

    expect(setReplaying).toHaveBeenCalledWith(true);
    expect(waitForRender).toHaveBeenCalledTimes(1);

    await releaseNext();
    const stream = await streamPromise;
    const reader = stream.getReader();

    await expect(reader.read()).resolves.toMatchObject({
      done: false,
      value: encoder.encode(replayPrefix),
    });
    expect(waitForRender).toHaveBeenCalledTimes(2);
    expect(setReplaying).toHaveBeenCalledTimes(1);

    let liveReadResolved = false;
    const liveRead = reader.read().then((read) => {
      liveReadResolved = true;
      return read;
    });
    await Promise.resolve();
    expect(liveReadResolved).toBe(false);

    await releaseNext();
    expect(setReplaying).toHaveBeenLastCalledWith(false);
    expect(waitForRender).toHaveBeenCalledTimes(3);
    await Promise.resolve();
    expect(liveReadResolved).toBe(false);

    await releaseNext();
    await expect(liveRead).resolves.toMatchObject({
      done: false,
      value: encoder.encode(liveSuffix),
    });
  });

  it("pauses when a chunk ends exactly at the replay boundary", async () => {
    const { waitForRender, releaseNext } = createRenderWait();
    const setReplaying = vi.fn();
    const replayPrefix = "replay";
    const liveSuffix = "live";
    const replayContentLength = encoder.encode(replayPrefix).byteLength;

    const streamPromise = createReplayBoundaryStream(
      createResponse([replayPrefix, liveSuffix], replayContentLength),
      { setReplaying, waitForRender },
    );

    await releaseNext();
    const stream = await streamPromise;
    const reader = stream.getReader();

    await expect(reader.read()).resolves.toMatchObject({
      done: false,
      value: encoder.encode(replayPrefix),
    });
    expect(setReplaying).toHaveBeenCalledTimes(1);

    let liveReadResolved = false;
    const liveRead = reader.read().then((read) => {
      liveReadResolved = true;
      return read;
    });
    await Promise.resolve();
    expect(liveReadResolved).toBe(false);

    await releaseNext();
    expect(setReplaying).toHaveBeenLastCalledWith(false);
    await releaseNext();

    await expect(liveRead).resolves.toMatchObject({
      done: false,
      value: encoder.encode(liveSuffix),
    });
  });

  it("accumulates replay bytes across chunks before splitting live bytes", async () => {
    const { waitForRender, releaseNext } = createRenderWait();
    const setReplaying = vi.fn();
    const firstReplayChunk = "part1";
    const secondReplayChunk = "part2";
    const firstLiveChunk = "live1";
    const secondLiveChunk = "live2";
    const replayContentLength = encoder.encode(
      firstReplayChunk + secondReplayChunk,
    ).byteLength;

    const streamPromise = createReplayBoundaryStream(
      createResponse(
        [firstReplayChunk, secondReplayChunk + firstLiveChunk, secondLiveChunk],
        replayContentLength,
      ),
      { setReplaying, waitForRender },
    );

    await releaseNext();
    const stream = await streamPromise;
    const reader = stream.getReader();

    await expect(reader.read()).resolves.toMatchObject({
      done: false,
      value: encoder.encode(firstReplayChunk),
    });
    await expect(reader.read()).resolves.toMatchObject({
      done: false,
      value: encoder.encode(secondReplayChunk),
    });
    expect(setReplaying).toHaveBeenCalledTimes(1);

    let liveReadResolved = false;
    const liveRead = reader.read().then((read) => {
      liveReadResolved = true;
      return read;
    });
    await Promise.resolve();
    expect(liveReadResolved).toBe(false);

    await releaseNext();
    expect(setReplaying).toHaveBeenLastCalledWith(false);
    await releaseNext();

    await expect(liveRead).resolves.toMatchObject({
      done: false,
      value: encoder.encode(firstLiveChunk),
    });
    await expect(reader.read()).resolves.toMatchObject({
      done: false,
      value: encoder.encode(secondLiveChunk),
    });
  });

  it("clears replaying when the stream ends before the boundary", async () => {
    const { waitForRender, releaseNext } = createRenderWait();
    const setReplaying = vi.fn();
    const streamPromise = createReplayBoundaryStream(
      createResponse(["hi"], 10),
      {
        setReplaying,
        waitForRender,
      },
    );

    await releaseNext();
    const stream = await streamPromise;
    const text = readText(stream);
    await releaseNext();
    await releaseNext();

    await expect(text).resolves.toBe("hi");
    expect(setReplaying).toHaveBeenLastCalledWith(false);
  });

  it("clears replaying when the gated stream is cancelled", async () => {
    const { waitForRender, releaseNext } = createRenderWait();
    const setReplaying = vi.fn();
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("hi"));
      },
      cancel() {
        cancelled = true;
      },
    });
    const streamPromise = createReplayBoundaryStream(
      new Response(body, { headers: { [REPLAY_CONTENT_LENGTH_HEADER]: "10" } }),
      { setReplaying, waitForRender },
    );

    await releaseNext();
    const stream = await streamPromise;
    await stream.cancel("done");

    expect(setReplaying).toHaveBeenLastCalledWith(false);
    expect(cancelled).toBe(true);
  });

  it("does not wait for replay completion after cancellation unblocks a read", async () => {
    const { waitForRender, releaseNext } = createRenderWait();
    const setReplaying = vi.fn();
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    const streamPromise = createReplayBoundaryStream(
      new Response(body, { headers: { [REPLAY_CONTENT_LENGTH_HEADER]: "10" } }),
      { setReplaying, waitForRender },
    );

    await releaseNext();
    const stream = await streamPromise;
    const reader = stream.getReader();
    const read = reader.read();

    await Promise.resolve();
    expect(waitForRender).toHaveBeenCalledTimes(1);

    await reader.cancel("done");
    await expect(read).resolves.toMatchObject({ done: true });

    expect(waitForRender).toHaveBeenCalledTimes(1);
    expect(setReplaying).toHaveBeenLastCalledWith(false);
    expect(cancelled).toBe(true);
  });

  it("lets data-stream parsing commit replayed text before live tool calls", async () => {
    const { waitForRender, releaseNext } = createRenderWait();
    const setReplaying = vi.fn();
    const replayPrefix = '0:"hi"\nb:{"toolCallId":"call-1","toolName":"te';
    const liveSuffix = 'st"}\n';
    const replayContentLength = encoder.encode(replayPrefix).byteLength;

    const streamPromise = createReplayBoundaryStream(
      createResponse([replayPrefix + liveSuffix], replayContentLength),
      { setReplaying, waitForRender },
    );

    await releaseNext();
    const messages = (await streamPromise)
      .pipeThrough(new DataStreamDecoder())
      .pipeThrough(new AssistantMessageAccumulator({ throttle: true }));
    const reader = messages.getReader();

    let sawReplayedText = false;
    while (!sawReplayedText) {
      const replayedMessage = await reader.read();
      expect(replayedMessage.done).toBe(false);
      expect(
        replayedMessage.value?.parts.some((part) => part.type === "tool-call"),
      ).toBe(false);
      sawReplayedText =
        replayedMessage.value?.parts.some(
          (part) => part.type === "text" && part.text === "hi",
        ) ?? false;
    }
    expect(setReplaying).toHaveBeenCalledTimes(1);

    const liveMessagePromise = reader.read();
    await releaseNext();
    expect(setReplaying).toHaveBeenLastCalledWith(false);
    await releaseNext();

    let liveMessage = await liveMessagePromise;
    while (
      !liveMessage.done &&
      !liveMessage.value?.parts.some(
        (part) => part.type === "tool-call" && part.toolName === "test",
      )
    ) {
      liveMessage = await reader.read();
    }
    expect(liveMessage.done).toBe(false);
  });
});
