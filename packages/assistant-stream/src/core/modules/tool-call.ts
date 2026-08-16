import type { AssistantStream } from "../AssistantStream";
import type { AssistantStreamChunk } from "../AssistantStreamChunk";
import { NO_RESULT, type ToolResponseLike } from "../tool/ToolResponse";
import type { ReadonlyJSONValue } from "../../utils/json/json-value";
import type { UnderlyingReadable } from "../utils/stream/UnderlyingReadable";
import { createTextStream, type TextStreamController } from "./text";

export type ToolCallStreamController = {
  argsText: TextStreamController;

  /**
   * Sets the tool response and settles the part. The part closes automatically
   * and subsequent calls are ignored.
   */
  setResponse(response: ToolResponseLike<ReadonlyJSONValue>): void;
  close(): void;
};

class ToolCallStreamControllerImpl implements ToolCallStreamController {
  private _isClosed = false;

  private _mergeTask: Promise<void>;
  private _controller: ReadableStreamDefaultController<AssistantStreamChunk>;

  constructor(
    _controller: ReadableStreamDefaultController<AssistantStreamChunk>,
  ) {
    this._controller = _controller;
    const stream = createTextStream({
      start: (c) => {
        this._argsTextController = c;
      },
    });

    let hasArgsText = false;
    this._mergeTask = stream.pipeTo(
      new WritableStream({
        write: (chunk) => {
          switch (chunk.type) {
            case "text-delta":
              hasArgsText = true;
              this._controller.enqueue(chunk);
              break;

            case "part-finish":
              if (!hasArgsText) {
                // if no argsText was provided, assume empty object
                this._controller.enqueue({
                  type: "text-delta",
                  textDelta: "{}",
                  path: [],
                });
              }
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

  async setResponse(response: ToolResponseLike<ReadonlyJSONValue>) {
    if (this._isClosed) return;

    // Wire decoders hand this a raw payload, so an omitted result is
    // materialized here rather than reaching the message part as a settled call
    // indistinguishable from one that never finished.
    const result = response.result;

    this._controller.enqueue({
      type: "result",
      path: [],
      ...(response.artifact !== undefined
        ? { artifact: response.artifact }
        : {}),
      result: result === undefined ? NO_RESULT : result,
      isError: response.isError ?? false,
      ...(response.modelContent !== undefined
        ? { modelContent: response.modelContent }
        : {}),
      ...(response.messages !== undefined
        ? { messages: response.messages }
        : {}),
    });
    await this.close();
  }

  async close() {
    if (this._isClosed) return;

    this._isClosed = true;
    this._argsTextController.close();
    await this._mergeTask;

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
