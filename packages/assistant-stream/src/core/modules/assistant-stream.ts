import { AssistantStream } from "../AssistantStream";
import { AssistantStreamChunk, PartInit } from "../AssistantStreamChunk";
import { createMergeStream } from "../utils/stream/merge";
import { createTextStreamController, TextStreamController } from "./text";
import {
  createToolCallStreamController,
  ToolCallStreamController,
} from "./tool-call";
import { Counter } from "../utils/Counter";
import {
  PathAppendEncoder,
  PathMergeEncoder,
} from "../utils/stream/path-utils";
import { DataStreamEncoder } from "../serialization/data-stream/DataStream";
import { FilePart, SourcePart } from "../utils/types";
import { generateId } from "../utils/generateId";
import {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "../../utils/json/json-value";
import { ToolResponseLike } from "../tool/ToolResponse";
import { promiseWithResolvers } from "../../utils/promiseWithResolvers";

type ToolCallPartInit = {
  toolCallId?: string;
  toolName: string;
  argsText?: string;
  args?: ReadonlyJSONObject;
  response?: ToolResponseLike<ReadonlyJSONValue>;
};

export type AssistantStreamController = {
  appendText(textDelta: string): void;
  appendReasoning(reasoningDelta: string): void;
  appendSource(options: SourcePart): void;
  appendFile(options: FilePart): void;
  addTextPart(): TextStreamController;
  addToolCallPart(options: string): ToolCallStreamController;
  addToolCallPart(options: ToolCallPartInit): ToolCallStreamController;
  enqueue(chunk: AssistantStreamChunk): void;
  merge(stream: AssistantStream): void;
  close(): void;
};

class AssistantStreamControllerImpl implements AssistantStreamController {
  private _merger = createMergeStream();
  private _append:
    | {
        controller: TextStreamController;
        kind: "text" | "reasoning";
      }
    | undefined;
  private _contentCounter = new Counter();

  get __internal_isClosed() {
    return this._merger.isSealed();
  }

  __internal_getReadable() {
    return this._merger.readable;
  }

  private _closeSubscriber: undefined | (() => void);
  __internal_subscribeToClose(callback: () => void) {
    this._closeSubscriber = callback;
  }

  private _addPart(part: PartInit, stream: AssistantStream) {
    if (this._append) {
      this._append.controller.close();
      this._append = undefined;
    }

    this.enqueue({
      type: "part-start",
      part,
      path: [],
    });
    this._merger.addStream(
      stream.pipeThrough(new PathAppendEncoder(this._contentCounter.value)),
    );
  }

  merge(stream: AssistantStream) {
    this._merger.addStream(
      stream.pipeThrough(new PathMergeEncoder(this._contentCounter)),
    );
  }

  appendText(textDelta: string) {
    if (this._append?.kind !== "text") {
      this._append = {
        kind: "text",
        controller: this.addTextPart(),
      };
    }
    this._append.controller.append(textDelta);
  }

  appendReasoning(textDelta: string) {
    if (this._append?.kind !== "reasoning") {
      this._append = {
        kind: "reasoning",
        controller: this.addReasoningPart(),
      };
    }
    this._append.controller.append(textDelta);
  }

  addTextPart() {
    const [stream, controller] = createTextStreamController();
    this._addPart({ type: "text" }, stream);
    return controller;
  }

  addReasoningPart() {
    const [stream, controller] = createTextStreamController();
    this._addPart({ type: "reasoning" }, stream);
    return controller;
  }

  addToolCallPart(
    options: string | ToolCallPartInit,
  ): ToolCallStreamController {
    const opt = typeof options === "string" ? { toolName: options } : options;
    const toolName = opt.toolName;
    const toolCallId = opt.toolCallId ?? generateId();

    const [stream, controller] = createToolCallStreamController();
    this._addPart({ type: "tool-call", toolName, toolCallId }, stream);

    if (opt.argsText !== undefined) {
      controller.argsText.append(opt.argsText);
      controller.argsText.close();
    }
    if (opt.args !== undefined) {
      controller.argsText.append(JSON.stringify(opt.args));
      controller.argsText.close();
    }
    if (opt.response !== undefined) {
      controller.setResponse(opt.response);
    }

    return controller;
  }

  appendSource(options: SourcePart) {
    this._addPart(
      options,
      new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: "part-finish",
            path: [],
          });
          controller.close();
        },
      }),
    );
  }

  appendFile(options: FilePart) {
    this._addPart(
      options,
      new ReadableStream({
        start(controller) {
          controller.enqueue({
            type: "part-finish",
            path: [],
          });
          controller.close();
        },
      }),
    );
  }

  enqueue(chunk: AssistantStreamChunk) {
    this._merger.enqueue(chunk);

    if (chunk.type === "part-start" && chunk.path.length === 0) {
      this._contentCounter.up();
    }
  }

  close() {
    this._merger.seal();
    this._append?.controller?.close();

    this._closeSubscriber?.();
  }
}

export function createAssistantStream(
  callback: (controller: AssistantStreamController) => PromiseLike<void> | void,
): AssistantStream {
  const controller = new AssistantStreamControllerImpl();

  let promiseOrVoid: PromiseLike<void> | void;
  try {
    promiseOrVoid = callback(controller);
  } catch (e) {
    if (!controller.__internal_isClosed) {
      controller.enqueue({
        type: "error",
        path: [],
        error: String(e),
      });
      controller.close();
    }
    throw e;
  }

  if (promiseOrVoid instanceof Promise) {
    const runTask = async () => {
      try {
        await promiseOrVoid;
      } catch (e) {
        if (!controller.__internal_isClosed) {
          controller.enqueue({
            type: "error",
            path: [],
            error: String(e),
          });
        }
        throw e;
      } finally {
        if (!controller.__internal_isClosed) {
          controller.close();
        }
      }
    };
    runTask();
  } else {
    if (!controller.__internal_isClosed) {
      controller.close();
    }
  }

  return controller.__internal_getReadable();
}

export function createAssistantStreamController() {
  const { resolve, promise } = promiseWithResolvers<void>();
  let controller!: AssistantStreamController;
  const stream = createAssistantStream((c) => {
    controller = c;

    (controller as AssistantStreamControllerImpl).__internal_subscribeToClose(
      resolve,
    );

    return promise;
  });
  return [stream, controller] as const;
}

export function createAssistantStreamResponse(
  callback: (controller: AssistantStreamController) => PromiseLike<void> | void,
) {
  return AssistantStream.toResponse(
    createAssistantStream(callback),
    new DataStreamEncoder(),
  );
}
