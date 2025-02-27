import { AssistantStream } from "../AssistantStream";
import { AssistantStreamChunk } from "../AssistantStreamChunk";
import { UnderlyingReadable } from "../utils/stream/UnderlyingReadable";
import { createTextStream, TextStreamController } from "./text";

export type ToolCallStreamController = {
  argsText: TextStreamController;

  setResult(result: unknown): void;
  close(): void;
};

class ToolCallStreamControllerImpl implements ToolCallStreamController {
  private _isClosed = false;

  constructor(
    private _controller: ReadableStreamDefaultController<AssistantStreamChunk>,
  ) {
    const stream = createTextStream({
      start: (c) => {
        this._argsTextController = c;
      },
    });
    stream.pipeTo(
      new WritableStream({
        write: (chunk) => {
          switch (chunk.type) {
            case "text-delta":
              this._controller.enqueue(chunk);
              break;

            case "part-finish":
              this._controller.enqueue({
                type: "tool-call-args-text-finish",
                path: [],
              });
              break;

            default:
              throw new Error(`Unexpected chunk type: ${chunk.type}`);
          }
        },
      }),
    );
  }

  get argsText() {
    return this._argsTextController;
  }

  private _argsTextController!: TextStreamController;

  setResult(result: unknown, isError?: boolean) {
    this._controller.enqueue({
      type: "result",
      path: [],
      result,
      isError: isError ?? false,
    });
  }

  close() {
    if (this._isClosed) return;

    this._isClosed = true;
    this._argsTextController.close();

    this._controller.enqueue({
      type: "part-finish",
      path: [],
    });
    this._controller.close();
  }
}

export const createToolCallStream = (
  readable: UnderlyingReadable<ToolCallStreamController>,
): AssistantStream => {
  return new ReadableStream({
    start(c) {
      return readable.start?.(new ToolCallStreamControllerImpl(c));
    },
    pull(c) {
      return readable.pull?.(new ToolCallStreamControllerImpl(c));
    },
    cancel(c) {
      return readable.cancel?.(c);
    },
  });
};

export const createToolCallStreamController = () => {
  let controller!: ToolCallStreamController;
  const stream = createToolCallStream({
    start(c) {
      controller = c;
    },
  });
  return [stream, controller] as const;
};
