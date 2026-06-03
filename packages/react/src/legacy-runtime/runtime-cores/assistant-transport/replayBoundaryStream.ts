"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const REPLAY_CONTENT_LENGTH_HEADER = "Aui-Replay-Content-Length";

type ReplayBoundaryStreamOptions = {
  setReplaying: (value: boolean) => void;
  waitForRender?: () => Promise<void>;
};

const waitForRender = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

export const useReplayRenderWait = () => {
  const [, rerender] = useState(0);
  const mountedRef = useRef(true);
  const waitersRef = useRef<Array<() => void>>([]);

  const resolveWaiters = useCallback(() => {
    const waiters = waitersRef.current;
    waitersRef.current = [];
    for (const resolve of waiters) {
      resolve();
    }
  }, []);

  useEffect(() => {
    resolveWaiters();
  });

  useEffect(
    () => () => {
      mountedRef.current = false;
      resolveWaiters();
    },
    [resolveWaiters],
  );

  return useCallback(
    () =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          if (!mountedRef.current) {
            resolve();
            return;
          }

          waitersRef.current.push(resolve);
          rerender((value) => value + 1);
        }, 0);
      }),
    [],
  );
};

const parseReplayContentLength = (headers: Headers): number => {
  const raw = headers.get(REPLAY_CONTENT_LENGTH_HEADER);
  if (raw == null) return 0;

  const boundary = Number(raw);
  return Number.isSafeInteger(boundary) && boundary > 0 ? boundary : 0;
};

/**
 * Splits the response body at `Aui-Replay-Content-Length` without closing the
 * decoder pipeline. The replay prefix is delivered while `isReplaying` has
 * rendered, then the stream pauses until React has rendered `isReplaying:
 * false` before live bytes are released. The render wait also gives the
 * downstream decoder/accumulator pipeline a task to consume the replay prefix.
 */
export const createReplayBoundaryStream = async (
  response: Response,
  {
    setReplaying,
    waitForRender: waitForReplayRender = waitForRender,
  }: ReplayBoundaryStreamOptions,
): Promise<ReadableStream<Uint8Array>> => {
  const body = response.body as ReadableStream<Uint8Array>;
  const replayContentLength = parseReplayContentLength(response.headers);

  if (replayContentLength <= 0) {
    return body;
  }

  setReplaying(true);
  await waitForReplayRender();

  const reader = body.getReader();
  let bytesForwarded = 0;
  let replayFinished = false;

  const finishReplay = async () => {
    if (replayFinished) return;
    replayFinished = true;

    // Let replay bytes drain before rendering live mode, then render live mode before releasing live bytes.
    await waitForReplayRender();
    setReplaying(false);
    await waitForReplayRender();
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();

      if (done) {
        await finishReplay();
        controller.close();
        return;
      }

      if (replayFinished) {
        controller.enqueue(value);
        return;
      }

      const nextBytesForwarded = bytesForwarded + value.byteLength;

      if (nextBytesForwarded < replayContentLength) {
        bytesForwarded = nextBytesForwarded;
        controller.enqueue(value);
        return;
      }

      if (nextBytesForwarded === replayContentLength) {
        bytesForwarded = nextBytesForwarded;
        controller.enqueue(value);
        await finishReplay();
        return;
      }

      const replayBytesInChunk = replayContentLength - bytesForwarded;
      bytesForwarded = nextBytesForwarded;

      if (replayBytesInChunk > 0) {
        controller.enqueue(value.subarray(0, replayBytesInChunk));
      }

      await finishReplay();
      controller.enqueue(value.subarray(replayBytesInChunk));
    },
    async cancel(reason) {
      setReplaying(false);
      await reader.cancel(reason);
    },
  });
};
