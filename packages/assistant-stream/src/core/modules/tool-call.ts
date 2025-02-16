import { AssistantStream, AssistantStreamChunk } from "../AssistantStream";
import { UnderlyingReadable } from "../utils/UnderlyingReadable";
import { createTextStream, TextStreamController } from "./text";

export type ToolCallStreamController = {
  readonly toolCallId: string;
  readonly toolName: string;

  argsText: TextStreamController;

  setResult(result: unknown): void;
  close(): void;
};

class ToolCallStreamControllerImpl implements ToolCallStreamController {
  public get toolCallId() {
    return this._options.toolCallId;
  }

  public get toolName() {
    return this._options.toolName;
  }

  constructor(
    private _controller: ReadableStreamDefaultController<AssistantStreamChunk>,
    private _options: { toolCallId: string; toolName: string },
  ) {
    this._controller.enqueue({
      type: "tool-call-begin",
      toolCallId: this._options.toolCallId,
      toolName: this._options.toolName,
    });

    const stream = createTextStream({
      start: (c) => {
        this._argsTextController = c;
      },
    });
    stream.pipeTo(
      new WritableStream({
        write: (chunk) => {
          if (chunk.type !== "text-delta")
            throw new Error("Unexpected chunk type");

          this._controller.enqueue({
            type: "tool-call-delta",
            toolCallId: this._options.toolCallId,
            argsTextDelta: chunk.textDelta,
          });
        },
      }),
    );
  }

  get argsText() {
    return this._argsTextController;
  }

  private _argsTextController!: TextStreamController;

  setResult(result: unknown) {
    this._controller.enqueue({
      type: "tool-result",
      toolCallId: this._options.toolCallId,
      result,
    });
  }

  close() {
    this._controller.close();
  }
}

type UnderlyingToolCallStreamReadable =
  UnderlyingReadable<ToolCallStreamController> & {
    toolCallId: string;
    toolName: string;
  };

export const createToolCallStream = (
  readable: UnderlyingToolCallStreamReadable,
): AssistantStream => {
  const options = {
    toolCallId: readable.toolCallId,
    toolName: readable.toolName,
  };
  return new ReadableStream({
    start(c) {
      return readable.start?.(new ToolCallStreamControllerImpl(c, options));
    },
    pull(c) {
      return readable.pull?.(new ToolCallStreamControllerImpl(c, options));
    },
    cancel(c) {
      return readable.cancel?.(c);
    },
  });
};
