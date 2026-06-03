import {
  AssistantMessageAccumulator,
  DataStreamDecoder,
} from "assistant-stream";
import { describe, expect, it, vi } from "vitest";
import { createReplayBoundaryStream } from "./replayBoundaryStream";

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
        : { "Aui-Replay-Content-Length": String(replayContentLength) },
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
    const body = await createReplayBoundaryStream(createResponse(["live"]), {
      setReplaying,
      waitForRender,
    });

    expect(await readText(body)).toBe("live");
    expect(setReplaying).not.toHaveBeenCalled();
    expect(waitForRender).not.toHaveBeenCalled();
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
