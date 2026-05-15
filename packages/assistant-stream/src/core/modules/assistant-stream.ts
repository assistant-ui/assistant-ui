import { AssistantStream } from "../AssistantStream";
import type { AssistantStreamChunk, PartInit } from "../AssistantStreamChunk";
import { createMergeStream } from "../utils/stream/merge";
import { createTextStreamController, type TextStreamController } from "./text";
import {
  createToolCallStreamController,
  type ToolCallStreamController,
} from "./tool-call";
import { Counter } from "../utils/Counter";
import {
  PathAppendEncoder,
  PathMergeEncoder,
} from "../utils/stream/path-utils";
import { DataStreamEncoder } from "../serialization/data-stream/DataStream";
import type { DataPart, FilePart, SourcePart } from "../utils/types";
import { generateId } from "../utils/generateId";
import type {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
} from "../../utils/json/json-value";
import type { ToolResponseLike } from "../tool/ToolResponse";
import { promiseWithResolvers } from "../../utils/promiseWithResolvers";

type ToolCallPartInit = {
  toolCallId?: string;
  toolName: string;
  argsText?: string;
  args?: ReadonlyJSONObject;
  response?: ToolResponseLike<ReadonlyJSONValue>;
};

/**
 * Imperative writer for constructing an {@link AssistantStream}.
 *
 * The controller handles part boundaries for common streaming operations. Use
 * `appendText` and `appendReasoning` for simple token streams, or open explicit
 * parts with `addTextPart` and `addToolCallPart` when you need direct control.
 */
export type AssistantStreamController = {
  /** Appends text to the current text part, opening one if needed. */
  appendText(textDelta: string): void;
  /** Appends reasoning text to the current reasoning part, opening one if needed. */
  appendReasoning(reasoningDelta: string): void;
  /** Appends a source citation part to the stream. */
  appendSource(options: SourcePart): void;
  /** Appends a file part to the stream. */
  appendFile(options: FilePart): void;
  /** Appends a named data part to the stream. */
  appendData(options: DataPart): void;
  /**
   * Opens a text part and returns its writer.
   *
   * Close the returned controller when the text part is complete. Opening a new
   * part through this controller closes any implicit text or reasoning append
   * part first.
   */
  addTextPart(): TextStreamController;
  /**
   * Opens a tool-call part by tool name and returns its writer.
   *
   * A tool call id is generated automatically. Use the object overload when the
   * caller already has an id, initial args, args text, or response.
   */
  addToolCallPart(options: string): ToolCallStreamController;
  /**
   * Opens a tool-call part and returns its writer.
   *
   * Use this overload to provide a stable `toolCallId`, initial arguments,
   * streamed argument text, or an immediate {@link ToolResponseLike}.
   */
  addToolCallPart(options: ToolCallPartInit): ToolCallStreamController;
  /** Enqueues a raw protocol chunk. Prefer higher-level helpers when possible. */
  enqueue(chunk: AssistantStreamChunk): void;
  /**
   * Merges another assistant stream into this stream.
   *
   * Paths from the merged stream are remapped so its parts appear at the next
   * available position in this controller's output.
   */
  merge(stream: AssistantStream): void;
  /** Closes any active part and finishes the stream. */
  close(): void;
  /**
   * Returns a controller that writes child parts with `parentId` attached.
   *
   * Use this for nested or related parts that should be associated with an
   * existing message or part in downstream renderers.
   */
  withParentId(parentId: string): AssistantStreamController;
};

// Shared state between controller instances
type AssistantStreamControllerState = {
  merger: ReturnType<typeof createMergeStream>;
  append?:
    | {
        controller: TextStreamController;
        kind: "text" | "reasoning";
      }
    | undefined;
  contentCounter: Counter;
  closeSubscriber?: () => void;
};

class AssistantStreamControllerImpl implements AssistantStreamController {
  private readonly _state: AssistantStreamControllerState;
  private _parentId?: string;

  constructor(state?: AssistantStreamControllerState) {
    this._state = state || {
      merger: createMergeStream(),
      contentCounter: new Counter(),
    };
  }

  get __internal_isClosed() {
    return this._state.merger.isSealed();
  }

  __internal_getReadable() {
    return this._state.merger.readable;
  }

  __internal_subscribeToClose(callback: () => void) {
    this._state.closeSubscriber = callback;
  }

  private _addPart(part: PartInit, stream: AssistantStream) {
    if (this._state.append) {
      this._state.append.controller.close();
      this._state.append = undefined;
    }

    this.enqueue({
      type: "part-start",
      part,
      path: [],
    });
    this._state.merger.addStream(
      stream.pipeThrough(
        new PathAppendEncoder(this._state.contentCounter.value),
      ),
    );
  }

  merge(stream: AssistantStream) {
    this._state.merger.addStream(
      stream.pipeThrough(new PathMergeEncoder(this._state.contentCounter)),
    );
  }

  appendText(textDelta: string) {
    if (this._state.append?.kind !== "text") {
      this._state.append = {
        kind: "text",
        controller: this.addTextPart(),
      };
    }
    this._state.append.controller.append(textDelta);
  }

  appendReasoning(textDelta: string) {
    if (this._state.append?.kind !== "reasoning") {
      this._state.append = {
        kind: "reasoning",
        controller: this.addReasoningPart(),
      };
    }
    this._state.append.controller.append(textDelta);
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
    this._addPart(
      {
        type: "tool-call",
        toolName,
        toolCallId,
        ...(this._parentId && { parentId: this._parentId }),
      },
      stream,
    );

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

  private _finishedPartStream(): AssistantStream {
    return new ReadableStream({
      start(controller) {
        controller.enqueue({ type: "part-finish", path: [] });
        controller.close();
      },
    });
  }

  private _withParentIdOption<T>(options: T): T {
    if (!this._parentId) return options;
    return { ...options, parentId: this._parentId };
  }

  appendSource(options: SourcePart) {
    this._addPart(
      this._withParentIdOption(options),
      this._finishedPartStream(),
    );
  }

  appendFile(options: FilePart) {
    this._addPart(
      this._withParentIdOption(options),
      this._finishedPartStream(),
    );
  }

  appendData(options: DataPart) {
    this._addPart(
      this._withParentIdOption(options),
      this._finishedPartStream(),
    );
  }

  enqueue(chunk: AssistantStreamChunk) {
    this._state.merger.enqueue(chunk);

    if (chunk.type === "part-start" && chunk.path.length === 0) {
      this._state.contentCounter.up();
    }
  }

  withParentId(parentId: string): AssistantStreamController {
    const controller = new AssistantStreamControllerImpl(this._state);
    controller._parentId = parentId;
    return controller;
  }

  close() {
    this._state.append?.controller?.close();
    this._state.merger.seal();

    this._state.closeSubscriber?.();
  }
}

export function createAssistantStream(
  callback: (controller: AssistantStreamController) => PromiseLike<void> | void,
): AssistantStream {
  const controller = new AssistantStreamControllerImpl();

  const runTask = async () => {
    try {
      await callback(controller);
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
