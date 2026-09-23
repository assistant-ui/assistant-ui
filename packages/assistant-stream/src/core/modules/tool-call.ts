import type { AssistantStream } from "../AssistantStream";
import type { AssistantStreamChunk } from "../AssistantStreamChunk";
import { NO_RESULT, type ToolResponseLike } from "../tool/ToolResponse";
import type { ReadonlyJSONValue } from "../../utils/json/json-value";
import type { UnderlyingReadable } from "../utils/stream/UnderlyingReadable";
import { TextStreamControllerImpl, type TextStreamController } from "./text";
import { closeIfOpen, enqueueIfOpen } from "../utils/stream/controller-guards";
import {
  createControllerStream,
  createControllerStreamPair,
} from "../utils/stream/createControllerStream";

export type ToolCallStreamController = {
  argsText: TextStreamController;

  /**
   * Sets a tool response. Preliminary responses keep the part open; a final
   * response closes it automatically and subsequent calls are ignored.
   */
  setResponse(response: ToolResponseLike<ReadonlyJSONValue>): void;
  close(): void;
};

type ToolCallStreamOptions = {
  strict?: boolean | undefined;
};

class ToolCallStreamControllerImpl implements ToolCallStreamController {
  private _isClosed = false;

  private _controller: ReadableStreamDefaultController<AssistantStreamChunk>;
  private _argsTextController: TextStreamController;

  constructor(
    _controller: ReadableStreamDefaultController<AssistantStreamChunk>,
    options: ToolCallStreamOptions = {},
  ) {
    this._controller = _controller;
    let hasArgsText = false;
    let isArgsTextFinished = false;
    this._argsTextController = new TextStreamControllerImpl(
      {
        enqueue: (chunk) => {
          if (isArgsTextFinished) {
            throw new TypeError("Cannot append to finished tool-call args");
          }
          if (chunk.type === "text-delta") {
            hasArgsText = true;
            this._controller.enqueue(chunk);
            return;
          }
          isArgsTextFinished = true;
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
        },
        close: () => {},
      },
      options,
    );
  }

  get argsText() {
    return this._argsTextController;
  }

  async setResponse(response: ToolResponseLike<ReadonlyJSONValue>) {
    if (this._isClosed) return;

    // Wire decoders hand this a raw payload, so an omitted result is
    // materialized here rather than reaching the message part as a settled call
    // indistinguishable from one that never finished.
    const result = response.result;

    enqueueIfOpen(this._controller, {
      type: "result",
      path: [],
      ...(response.artifact !== undefined
        ? { artifact: response.artifact }
        : {}),
      result: result === undefined ? NO_RESULT : result,
      isError: response.isError ?? false,
      ...(response.isPreliminary ? { isPreliminary: true } : {}),
      ...(response.modelContent !== undefined
        ? { modelContent: response.modelContent }
        : {}),
      ...(response.messages !== undefined
        ? { messages: response.messages }
        : {}),
    });
    if (response.isPreliminary) {
      this._argsTextController.close();
    } else {
      await this.close();
    }
  }

  async close() {
    if (this._isClosed) return;

    this._isClosed = true;
    this._argsTextController.close();

    enqueueIfOpen(this._controller, {
      type: "part-finish",
      path: [],
    });
    closeIfOpen(this._controller);
  }
}

export const createToolCallStream = (
  readable: UnderlyingReadable<ToolCallStreamController>,
  options: ToolCallStreamOptions = {},
): AssistantStream => {
  return createControllerStream(
    readable,
    (controller) => new ToolCallStreamControllerImpl(controller, options),
  );
};

export const createToolCallStreamController = (
  options: ToolCallStreamOptions = {},
) => {
  return createControllerStreamPair<
    AssistantStreamChunk,
    ToolCallStreamController
  >((controller) => new ToolCallStreamControllerImpl(controller, options));
};
