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

interface AssistantTransformerFlushCallback {
  (controller: AssistantTransformStreamController): void | PromiseLike<void>;
}

interface AssistantTransformerStartCallback {
  (controller: AssistantTransformStreamController): void | PromiseLike<void>;
}

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

    super(
      {
        start(controller) {
          stream.pipeTo(
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

          transformer.start?.(runController);
        },
        transform(chunk) {
          transformer.transform?.(chunk, runController);
        },
        flush() {
          transformer.flush?.(runController);
        },
      },
      writableStrategy,
      readableStrategy,
    );
  }
}
