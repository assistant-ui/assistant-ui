import { AssistantStream, AssistantStreamChunk } from "../AssistantStream";
import { DataStreamEncoder } from "../serialization/DataStream";
import { generateId } from "../utils/generateId";
import { createTextStream, TextStreamController } from "./text";
import { createToolCallStream, ToolCallStreamController } from "./tool-call";

type MergeStreamItem = {
  reader: ReadableStreamDefaultReader<AssistantStreamChunk>;
  promise?: Promise<unknown> | undefined;
};

const promiseWithResolvers = () => {
  let resolve: () => void;
  let reject: (reason?: any) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve: resolve!, reject: reject! };
};

const createMergeStream = () => {
  const list: MergeStreamItem[] = [];
  let sealed = false;
  let controller: ReadableStreamDefaultController<AssistantStreamChunk>;
  let currentPull: ReturnType<typeof promiseWithResolvers> | undefined;

  const handlePull = (item: MergeStreamItem) => {
    if (!item.promise) {
      item.promise = item.reader
        .read()
        .then(({ done, value }) => {
          item.promise = undefined;
          if (done) {
            list.splice(list.indexOf(item), 1);
            if (sealed && list.length === 0) {
              controller.close();
            }
          } else {
            controller.enqueue(value);
          }

          currentPull?.resolve();
          currentPull = undefined;
        })
        .catch((e) => {
          list.forEach((item) => {
            item.reader.cancel();
          });
          list.length = 0;

          controller.error(e);

          currentPull?.reject(e);
          currentPull = undefined;
        });
    }
  };

  const readable = new ReadableStream<AssistantStreamChunk>({
    start(c) {
      controller = c;
    },
    async pull() {
      list.map((item) => {
        handlePull(item);
        return item.promise!;
      });

      currentPull = promiseWithResolvers();
      return currentPull.promise;
    },
    cancel() {
      list.forEach((item) => {
        item.reader.cancel();
      });
      list.length = 0;
    },
  });

  return {
    stream: readable,
    seal() {
      sealed = true;
      if (list.length === 0) controller.close();
    },
    addStream(stream: AssistantStream) {
      if (sealed)
        throw new Error(
          "Cannot add streams after the run callback has settled.",
        );

      const item = { reader: stream.getReader() };
      list.push(item);
      if (list.length === 1) {
        handlePull(item);
      }
    },
  };
};

export type AssistantStreamController = {
  appendText(textDelta: string): void;
  // addTextPart(): TextStreamController;
  addToolCallPart(toolName: string): ToolCallStreamController;
  addToolCallPart(options: {
    toolCallId?: string;
    toolName: string;
    args?: Record<string, unknown>;
    result?: unknown;
  }): ToolCallStreamController;

  merge(stream: AssistantStream): void;
};

class RunControllerImpl implements AssistantStreamController {
  private _merge = createMergeStream();
  private _textPartController: TextStreamController | undefined;

  getReadable() {
    return this._merge.stream;
  }

  close() {
    this._merge.seal();
    this._textPartController?.close();
  }

  merge(stream: AssistantStream) {
    this._merge.addStream(stream);
  }

  appendText(textDelta: string) {
    if (!this._textPartController) {
      this._textPartController = this.addTextPart();
    }
    this._textPartController.append(textDelta);
  }

  addTextPart() {
    let controller: TextStreamController;
    const textStream = createTextStream({
      start(c) {
        controller = c;
      },
    });
    this.merge(textStream);
    return controller!;
  }

  addToolCallPart(
    options:
      | string
      | {
          toolName: string;
          toolCallId?: string;
          args?: Record<string, unknown>;
          result?: unknown;
        },
  ): ToolCallStreamController {
    const opt = typeof options === "string" ? { toolName: options } : options;

    let controller: ToolCallStreamController;
    const toolCallStream = createToolCallStream({
      toolCallId: opt.toolCallId ?? generateId(),
      toolName: opt.toolName,
      start(c) {
        controller = c;
      },
    });
    this.merge(toolCallStream);

    if (opt.args !== undefined) {
      controller!.argsText.append(JSON.stringify(opt.args));
      controller!.argsText.close();
    }
    if (opt !== undefined) {
      controller!.setResult(opt.result);
    }

    return controller!;
  }

  addError(error: string) {
    this._merge.addStream(
      new ReadableStream({
        start(c) {
          c.enqueue({
            type: "error",
            error,
          });
        },
      }),
    );
  }
}

export function createAssistantStream(
  callback: (controller: AssistantStreamController) => PromiseLike<void> | void,
): AssistantStream {
  const controller = new RunControllerImpl();
  const promiseOrVoid = callback(controller);
  if (promiseOrVoid instanceof Promise) {
    const runTask = async () => {
      try {
        await promiseOrVoid;
      } catch (e) {
        controller.addError(e instanceof Error ? e.message : String(e));
        throw e;
      } finally {
        controller.close();
      }
    };
    runTask();
  } else {
    controller.close();
  }

  return controller.getReadable();
}

export function createAssistantStreamResponse(
  callback: (controller: AssistantStreamController) => PromiseLike<void> | void,
) {
  return AssistantStream.toResponse(
    createAssistantStream(callback),
    new DataStreamEncoder(),
  );
}
