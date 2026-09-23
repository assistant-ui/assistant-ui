import type { AssistantStream } from "../AssistantStream";
import type { AssistantStreamChunk } from "../AssistantStreamChunk";
import { closeIfOpen, enqueueIfOpen } from "../utils/stream/controller-guards";
import {
  createControllerStream,
  createControllerStreamPair,
} from "../utils/stream/createControllerStream";
import type { UnderlyingReadable } from "../utils/stream/UnderlyingReadable";

export type TextStreamController = {
  append(textDelta: string): void;
  close(): void; // TODO reason? error?
};

type TextStreamOptions = {
  strict?: boolean | undefined;
};

type ChunkSink = {
  enqueue(chunk: AssistantStreamChunk): void;
  close(): void;
};

export class TextStreamControllerImpl implements TextStreamController {
  private _controller: ChunkSink;
  private _strict: boolean;
  private _isClosed = false;
  private _warnedDropped = false;

  constructor(controller: ChunkSink, options: TextStreamOptions = {}) {
    this._controller = controller;
    this._strict = options.strict ?? true;
  }

  append(textDelta: string) {
    const chunk: AssistantStreamChunk = {
      type: "text-delta",
      path: [],
      textDelta,
    };
    if (this._isClosed) {
      if (this._strict) {
        throw new TypeError("Cannot append to a closed TextStreamController");
      }
      enqueueIfOpen(this._controller, chunk, this._warnDroppedAfterClose);
      return this;
    }
    enqueueIfOpen(this._controller, chunk);
    return this;
  }

  private _warnDroppedAfterClose = (error: TypeError) => {
    if (this._warnedDropped) return;
    this._warnedDropped = true;
    console.error(`Dropped text delta for closed stream: ${String(error)}`);
  };

  close() {
    if (this._isClosed) return;
    this._isClosed = true;
    enqueueIfOpen(this._controller, {
      type: "part-finish",
      path: [],
    });
    closeIfOpen(this._controller);
  }
}

export const createTextStream = (
  readable: UnderlyingReadable<TextStreamController>,
  options: TextStreamOptions = {},
): AssistantStream => {
  return createControllerStream(
    readable,
    (controller) => new TextStreamControllerImpl(controller, options),
  );
};

export const createTextStreamController = (options: TextStreamOptions = {}) => {
  return createControllerStreamPair<AssistantStreamChunk, TextStreamController>(
    (controller) => new TextStreamControllerImpl(controller, options),
  );
};
