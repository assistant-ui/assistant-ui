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
  private _hasArgsText = false;
  private _argsTextState: "open" | "finishing" | "finished" = "open";

  private _controller: ReadableStreamDefaultController<AssistantStreamChunk>;
  private _argsTextController: TextStreamController;

  constructor(
    _controller: ReadableStreamDefaultController<AssistantStreamChunk>,
    options: ToolCallStreamOptions = {},
  ) {
    this._controller = _controller;
    this._argsTextController = new TextStreamControllerImpl(
      {
        enqueue: (chunk) => {
          if (this._argsTextState !== "open") {
            // enqueueIfOpen reads any TypeError as a closed stream, so lenient
            // mode drops this delta with its warning instead of throwing.
            throw new TypeError("Cannot append to finished tool-call args");
          }
          if (chunk.type === "text-delta") {
            this._hasArgsText = true;
            this._controller.enqueue(chunk);
            return;
          }
          // The args finish waits for the end of the tick so a result set in
          // the same tick goes out first; ToolExecutionStream only treats a
          // backend result as authoritative when it precedes the args finish.
          this._argsTextState = "finishing";
          queueMicrotask(() => this._finishArgsText());
        },
        close: () => {},
      },
      options,
    );
  }

  private _finishArgsText() {
    if (this._argsTextState !== "finishing") return;
    this._argsTextState = "finished";
    if (!this._hasArgsText) {
      // if no argsText was provided, assume empty object
      enqueueIfOpen(this._controller, {
        type: "text-delta",
        textDelta: "{}",
        path: [],
      });
    }
    enqueueIfOpen(this._controller, {
      type: "tool-call-args-text-finish",
      path: [],
    });
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
      this._finishArgsText();
    } else {
      await this.close();
    }
  }

  async close() {
    if (this._isClosed) return;

    this._isClosed = true;
    this._argsTextController.close();
    this._finishArgsText();

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
