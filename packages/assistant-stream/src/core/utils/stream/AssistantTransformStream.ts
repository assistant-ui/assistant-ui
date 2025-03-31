import { AssistantStreamChunk } from "../../AssistantStreamChunk";
import {
  AssistantStreamController,
  createAssistantStreamController,
} from "../../modules/assistant-stream";

export interface AssistantTransformStreamController
  extends AssistantStreamController {
  // readonly desiredSize: number | null;
  // error(reason?: any): void;
  // terminate(): void;
}

type AssistantTransformerFlushCallback = (
  controller: AssistantTransformStreamController,
) => void | PromiseLike<void>;

type AssistantTransformerStartCallback = (
  controller: AssistantTransformStreamController,
) => void | PromiseLike<void>;

interface AssistantTransformerTransformCallback<I> {
  (
    chunk: I,
    controller: AssistantTransformStreamController,
  ): void | PromiseLike<void>;
}

type AssistantTransformer<I> = {
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
    const [stream, runController] = createAssistantStreamController();

    let runPipeTask: Promise<void>;
    super(
      {
        start(controller) {
          runPipeTask = stream.pipeTo(
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
          );

          return transformer.start?.(runController);
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
  }
}
