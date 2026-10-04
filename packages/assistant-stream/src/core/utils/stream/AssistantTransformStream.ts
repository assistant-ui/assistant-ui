import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
import {
  type AssistantStreamController,
  createAssistantStreamController,
} from "../../modules/assistant-stream";

type AssistantTransformerFlushCallback = (
  controller: AssistantStreamController,
) => void | PromiseLike<void>;

type AssistantTransformerStartCallback = (
  controller: AssistantStreamController,
) => void | PromiseLike<void>;

type AssistantTransformerTransformCallback<I> = (
  chunk: I,
  controller: AssistantStreamController,
) => void | PromiseLike<void>;

type AssistantTransformer<I> = {
  strict?: boolean | undefined;
  flush?: AssistantTransformerFlushCallback;
  start?: AssistantTransformerStartCallback;
  transform?: AssistantTransformerTransformCallback<I>;
};

export class AssistantTransformStream<I> extends TransformStream<
  I,
  AssistantStreamChunk
> {
  constructor(
    transformer: AssistantTransformer<I>,
    writableStrategy?: QueuingStrategy<I>,
    readableStrategy?: QueuingStrategy<AssistantStreamChunk>,
  ) {
    const [stream, runController] = createAssistantStreamController({
      strict: transformer.strict,
    });
    const abortController = new AbortController();

    let runPipeTask: Promise<void>;
    super(
      {
        start(controller) {
          runPipeTask = stream
            .pipeTo(
              new WritableStream({
                write(chunk) {
                  controller.enqueue(chunk);
                },
                abort(reason?: any) {
                  controller.error(reason);
                },
                close() {
                  controller.terminate();
                },
              }),
              { signal: abortController.signal },
            )
            .catch((error) => {
              controller.error(error);
            });

          try {
            return transformer.start?.(runController);
          } catch (error) {
            abortController.abort(error);
            throw error;
          }
        },
        transform(chunk) {
          return transformer.transform?.(chunk, runController);
        },
        async flush() {
          await transformer.flush?.(runController);
          runController.close();
          await runPipeTask;
        },
      },
      writableStrategy,
      readableStrategy,
    );

    // Transformer.cancel is not implemented by all supported browsers.
    const reader = super.readable.getReader();
    let cancelled = false;
    Object.defineProperty(this, "readable", {
      value: new ReadableStream<AssistantStreamChunk>(
        {
          start(controller) {
            void reader.closed.catch((error) => {
              abortController.abort(error);
              controller.error(error);
              reader.releaseLock();
            });
          },
          async pull(controller) {
            const result = await reader.read();
            if (cancelled) return;
            if (result.done) {
              controller.close();
              reader.releaseLock();
            } else {
              controller.enqueue(result.value);
            }
          },
          async cancel(reason) {
            cancelled = true;
            const cancellation = reader.cancel(reason);
            abortController.abort(reason);
            try {
              await cancellation;
            } finally {
              await runPipeTask;
              reader.releaseLock();
            }
          },
        },
        { highWaterMark: 0 },
      ),
      writable: false,
    });
  }
}
