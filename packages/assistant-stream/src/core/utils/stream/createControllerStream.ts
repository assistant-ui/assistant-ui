import type { UnderlyingReadable } from "./UnderlyingReadable";

export const createControllerStream = <TChunk, TController>(
  readable: UnderlyingReadable<TController>,
  makeController: (
    controller: ReadableStreamDefaultController<TChunk>,
  ) => TController,
) =>
  new ReadableStream<TChunk>({
    start(controller) {
      return readable.start?.(makeController(controller));
    },
    pull(controller) {
      return readable.pull?.(makeController(controller));
    },
    cancel(reason) {
      return readable.cancel?.(reason);
    },
  });

export const createControllerStreamPair = <TChunk, TController>(
  makeController: (
    controller: ReadableStreamDefaultController<TChunk>,
  ) => TController,
  onCancel?: (
    controller: TController,
    reason: unknown,
  ) => void | PromiseLike<void>,
) => {
  let controller!: TController;
  const stream = createControllerStream<TChunk, TController>(
    {
      start(value) {
        controller = value;
      },
      cancel(reason) {
        return onCancel?.(controller, reason);
      },
    },
    makeController,
  );

  return [stream, controller] as const;
};
