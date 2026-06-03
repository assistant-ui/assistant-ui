"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const REPLAY_CONTENT_LENGTH_HEADER = "Aui-Replay-Content-Length";

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

// Gates replay bytes until isReplaying:true renders, then releases live bytes after isReplaying:false renders.
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
        controller.enqueue(value);
        await finishReplay();
        return;
      }

      const replayBytesInChunk = replayContentLength - bytesForwarded;

      controller.enqueue(value.subarray(0, replayBytesInChunk));
      await finishReplay();
      controller.enqueue(value.subarray(replayBytesInChunk));
    },
    async cancel(reason) {
      const wasFinished = replayFinished;
      replayFinished = true;
      if (!wasFinished) setReplaying(false);
      await reader.cancel(reason);
    },
  });
};
