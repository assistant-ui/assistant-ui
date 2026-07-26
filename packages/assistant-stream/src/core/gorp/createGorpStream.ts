import type { ReadonlyJSONValue } from "../../utils";
import { withPromiseOrValue } from "../utils/withPromiseOrValue";
import { GorpStreamAccumulator } from "./GorpStreamAccumulator";
import type { GorpStreamOperation, GorpStreamChunk } from "./types";

type GorpStreamController = {
  readonly abortSignal: AbortSignal;

  enqueue(operations: readonly GorpStreamOperation[]): void;
};

class GorpStreamControllerImpl implements GorpStreamController {
  private _controller: ReadableStreamDefaultController<GorpStreamChunk>;
  private _abortController = new AbortController();
  private _accumulator: GorpStreamAccumulator;
  private _cancelled = false;

  get abortSignal() {
    return this._abortController.signal;
  }

  constructor(
    controller: ReadableStreamDefaultController<GorpStreamChunk>,
    defaultValue: ReadonlyJSONValue,
  ) {
    this._controller = controller;
    this._accumulator = new GorpStreamAccumulator(defaultValue);
  }

  enqueue(operations: readonly GorpStreamOperation[]) {
    if (this._cancelled) return;

    this._accumulator.append(operations);

    this._controller.enqueue({
      snapshot: this._accumulator.state,
      operations,
    });
  }

  __internalError(error: unknown) {
    if (this._cancelled) return;
    this._controller.error(error);
  }

  __internalClose() {
    if (this._cancelled) return;
    this._controller.close();
  }

  __internalCancel(reason?: unknown) {
    this._cancelled = true;
    this._abortController.abort(reason);
  }
}

const getStreamControllerPair = (defaultValue: ReadonlyJSONValue) => {
  let controller!: GorpStreamControllerImpl;
  const stream = new ReadableStream<GorpStreamChunk>({
    start(c) {
      controller = new GorpStreamControllerImpl(c, defaultValue);
    },
    cancel(reason: unknown) {
      controller.__internalCancel(reason);
    },
  });

  return [stream, controller] as const;
};

type CreateGorpStreamOptions = {
  execute: (controller: GorpStreamController) => void | PromiseLike<void>;
  defaultValue?: ReadonlyJSONValue;
};

export const createGorpStream = ({
  execute,
  defaultValue = {},
}: CreateGorpStreamOptions) => {
  const [stream, controller] = getStreamControllerPair(defaultValue);

  withPromiseOrValue(
    () => execute(controller),
    () => {
      controller.__internalClose();
    },
    (e: unknown) => {
      controller.__internalError(e);
    },
  );

  return stream;
};
