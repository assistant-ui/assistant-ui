import type { AssistantStream } from "../AssistantStream";
import type { AssistantStreamChunk } from "../AssistantStreamChunk";
import type { UnderlyingReadable } from "../utils/stream/UnderlyingReadable";

export type TextStreamController = {
  append(textDelta: string): void;
  close(): void; // TODO reason? error?
};

type TextStreamOptions = {
  strict?: boolean | undefined;
};

class TextStreamControllerImpl implements TextStreamController {
  private _controller: ReadableStreamDefaultController<AssistantStreamChunk>;
  private _strict: boolean;
  private _isClosed = false;
  private _warnedDropped = false;

  constructor(
    controller: ReadableStreamDefaultController<AssistantStreamChunk>,
    options: TextStreamOptions = {},
  ) {
    this._controller = controller;
    this._strict = options.strict ?? true;
  }

  append(textDelta: string) {
    const chunk: AssistantStreamChunk = {
      type: "text-delta",
      path: [],
      textDelta,
    };
    if (this._strict) {
      this._controller.enqueue(chunk);
      return this;
    }
    try {
      this._controller.enqueue(chunk);
    } catch (error) {
      if (!this._warnedDropped) {
        this._warnedDropped = true;
        console.error(`Dropped text delta for closed stream: ${String(error)}`);
      }
    }
    return this;
  }

  close() {
    if (this._isClosed) return;
    this._isClosed = true;
    this._controller.enqueue({
      type: "part-finish",
      path: [],
    });
    this._controller.close();
  }
}

export const createTextStream = (
  readable: UnderlyingReadable<TextStreamController>,
  options: TextStreamOptions = {},
): AssistantStream => {
  return new ReadableStream({
    start(c) {
      return readable.start?.(new TextStreamControllerImpl(c, options));
    },
    pull(c) {
      return readable.pull?.(new TextStreamControllerImpl(c, options));
    },
    cancel(c) {
      return readable.cancel?.(c);
    },
  });
};

export const createTextStreamController = (options: TextStreamOptions = {}) => {
  let controller!: TextStreamController;
  const stream = createTextStream(
    {
      start(c) {
        controller = c;
      },
    },
    options,
  );
  return [stream, controller] as const;
};
