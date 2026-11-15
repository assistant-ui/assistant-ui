import type { AssistantStreamChunk } from "../../AssistantStreamChunk";
import { Counter } from "../Counter";
import { createPathMergeMapper } from "./path-utils";
import { promiseWithResolvers } from "../../../utils/promiseWithResolvers";

export type MergeStreamFinishOrder = {
  previous: () => Promise<void>;
  delivered: ReturnType<typeof promiseWithResolvers<void>>;
};

type MergeStreamHold = {
  writtenBefore: number;
  reached: ReturnType<typeof promiseWithResolvers<void>>;
  flushed: Promise<void>;
};

/**
 * How many chunks a part stream has written. The merge stream sets `onWrite`
 * so it learns when an idle part writes again without polling every part.
 */
export type MergeStreamWriteCounter = {
  readonly count: number;
  onWrite: (() => void) | undefined;
};

type MergeStreamItem = {
  /** Order of `addStream` calls; reads start in this order. */
  seq: number;
  reader: ReadableStreamDefaultReader<AssistantStreamChunk>;
  pipeTask?: Promise<unknown> | undefined;
  promise?: Promise<unknown> | undefined;
  orderedFinish?: MergeStreamFinishOrder | undefined;
  written?: MergeStreamWriteCounter | undefined;
  delivered: number;
  /** The part barrier count when this item last had nothing undelivered. */
  idleAt: number;
  /** Whether this item is in `busy`, which may still hold it after it caught up. */
  inBusy: boolean;
  gate?: Promise<void> | undefined;
  holds: MergeStreamHold[];
  pathMapper?:
    | ((chunk: AssistantStreamChunk) => AssistantStreamChunk)
    | undefined;
};

type PartIndexReference = {
  value: number | undefined;
  promise: Promise<number>;
};

type PartIndexReservation = {
  reference: PartIndexReference;
  resolve: (index: number) => void;
};

type RawChunkBatchItem = {
  chunk: AssistantStreamChunk;
  partIndex?: PartIndexReservation | undefined;
};

type MergeStreamOptions = {
  orderedFinish?: MergeStreamFinishOrder | undefined;
  written?: MergeStreamWriteCounter | undefined;
  pathTransform?: "merge" | undefined;
};

export const createMergeStream = () => {
  const list = new Set<MergeStreamItem>();
  // Items with no read in flight. A pull starts reads only for these, so its
  // cost does not grow with the number of open parts.
  let unread: MergeStreamItem[] = [];
  // Every counted item with chunks not yet delivered, plus items that caught up
  // since the last part barrier, which prunes them. Only items with undelivered
  // chunks need a hold at a part barrier; an idle item instead takes the latest
  // part barrier as its gate when it writes again.
  const busy = new Set<MergeStreamItem>();
  let countedItems = 0;
  let partBarriers = 0;
  let latestPartBarrier: Promise<void> | undefined;
  let nextSeq = 0;
  const pendingPartIndexes = new Set<PartIndexReservation>();
  const contentCounter = new Counter();
  let sealed = false;
  let cancelled = false;
  let errored = false;
  let controller: ReadableStreamDefaultController<AssistantStreamChunk>;
  let rawChunkBatch: RawChunkBatchItem[] | undefined;
  let rawBarrier: Promise<void> | undefined;
  let pendingRawBatches = 0;
  let currentPull: ReturnType<typeof promiseWithResolvers<void>> | undefined;
  let cleanupPromise: Promise<void> | undefined;

  const releaseHolds = (item: MergeStreamItem) => {
    for (const hold of item.holds) hold.reached.resolve();
    item.holds = [];
  };

  const cancelAllReaders = () => {
    // Repeated cancellation must wait for cleanup already in progress.
    rawChunkBatch = undefined;
    for (const partIndex of pendingPartIndexes) {
      partIndex.reference.value = -1;
      partIndex.resolve(-1);
    }
    pendingPartIndexes.clear();
    if (!cleanupPromise) {
      const items = [...list];
      list.clear();
      unread = [];
      busy.clear();
      countedItems = 0;
      for (const item of items) {
        if (item.written) item.written.onWrite = undefined;
        item.orderedFinish?.delivered.resolve();
        releaseHolds(item);
      }
      cleanupPromise = Promise.all(
        items.map(async (item) => {
          try {
            await item.reader.cancel().catch(() => undefined);
            await item.pipeTask;
          } finally {
            item.reader.releaseLock();
          }
        }),
      ).then(() => undefined);
    }
    return cleanupPromise;
  };

  const handleError = (e: unknown) => {
    if (cancelled || errored) return;

    errored = true;
    console.error(e);
    void cancelAllReaders();

    controller.error(e);

    currentPull?.reject(e);
    currentPull = undefined;
  };

  const markIdleIfCaughtUp = (item: MergeStreamItem) => {
    if (item.written && item.delivered >= item.written.count) {
      item.idleAt = partBarriers;
    }
  };

  const noteWrite = (item: MergeStreamItem) => {
    // Only the write that ends an idle stretch has work to do.
    if (item.delivered < item.written!.count - 1) return;
    if (!item.inBusy) {
      item.inBusy = true;
      busy.add(item);
    }
    // A chunk written after a part barrier must not pass that part-start.
    if (latestPartBarrier && partBarriers > item.idleAt) {
      item.gate = item.gate
        ? Promise.all([item.gate, latestPartBarrier]).then(() => undefined)
        : latestPartBarrier;
    }
  };

  const removeItem = (item: MergeStreamItem) => {
    list.delete(item);
    busy.delete(item);
    if (item.written) {
      item.written.onWrite = undefined;
      countedItems--;
    }
  };

  const handlePull = (item: MergeStreamItem) => {
    if (!item.promise) {
      // TODO for most streams, we can directly pipeTo to avoid the microTask queue
      // add an option to eagerly pipe the stream to the merge stream
      // ideally, using assistant-stream w sync run method + piping to a sync WritableStream runs in the same microtask
      // this is useful because we often use AssistantStreams internally as a serialization utility, e. g. AssistantTransformStream
      // idea: avoid reader.read() by instead using a WritableStream & if (!hasPendingPull) await waitForPull()?
      item.promise = item.reader
        .read()
        .then(async ({ done, value }) => {
          if (cancelled || errored) return;

          if (done) {
            item.orderedFinish?.delivered.resolve();
            removeItem(item);
            item.reader.releaseLock();
            releaseHolds(item);
            if (sealed && list.size === 0 && pendingRawBatches === 0) {
              controller.close();
            }
          } else {
            if (item.gate) {
              await item.gate;
              item.gate = undefined;
              if (cancelled || errored) return;
            }
            while (
              item.holds[0] &&
              item.delivered >= item.holds[0].writtenBefore
            ) {
              await item.holds[0].flushed;
              item.holds.shift();
              if (cancelled || errored) return;
            }
            if (value.type === "part-finish" && item.orderedFinish) {
              await item.orderedFinish.previous();
              if (cancelled || errored) return;
            }
            controller.enqueue(item.pathMapper?.(value) ?? value);
            item.delivered++;
            markIdleIfCaughtUp(item);
            for (const hold of item.holds) {
              if (item.delivered >= hold.writtenBefore) hold.reached.resolve();
            }
            if (value.type === "part-finish") {
              item.orderedFinish?.delivered.resolve();
            }
          }

          item.promise = undefined;
          if (!done) unread.push(item);
          currentPull?.resolve();
          currentPull = undefined;
        })
        .catch((error) => {
          item.promise = undefined;
          handleError(error);
        });
    }
  };

  const readable = new ReadableStream<AssistantStreamChunk>({
    start(c) {
      controller = c;
    },
    pull() {
      currentPull = promiseWithResolvers();
      const items = unread;
      unread = [];
      if (items.length > 1) items.sort((a, b) => a.seq - b.seq);
      for (const item of items) handlePull(item);

      return currentPull.promise;
    },
    async cancel() {
      cancelled = true;
      const cleanup = cancelAllReaders();
      currentPull?.resolve();
      currentPull = undefined;
      await cleanup;
    },
  });

  const holdChild = (item: MergeStreamItem, flushed: Promise<void>) => {
    const hold: MergeStreamHold = {
      writtenBefore: item.written!.count,
      reached: promiseWithResolvers<void>(),
      flushed,
    };
    if (item.delivered >= hold.writtenBefore) hold.reached.resolve();
    item.holds.push(hold);
    return hold.reached.promise;
  };

  const enqueueRawChunk = (
    chunk: AssistantStreamChunk,
    partIndex?: PartIndexReservation,
  ) => {
    // Part starts and message-level boundaries wait for earlier writes; later chunks wait for them.
    const waitForPartWrites =
      chunk.type === "part-start" ||
      chunk.type === "step-finish" ||
      chunk.type === "message-finish" ||
      chunk.type === "error";
    // Active child reads split raw batches to preserve microtask ordering.
    if (list.size > 0 || waitForPartWrites) {
      rawChunkBatch = undefined;
    }

    if (!rawChunkBatch) {
      const batch: RawChunkBatchItem[] = [];
      rawChunkBatch = batch;
      pendingRawBatches++;
      const previous = rawBarrier;
      const partBarrier = waitForPartWrites && countedItems > 0;
      const flushed =
        previous || partBarrier ? promiseWithResolvers<void>() : undefined;
      const reached: Promise<void>[] = [];
      if (flushed && partBarrier) {
        for (const item of busy) {
          if (item.delivered < item.written!.count) {
            reached.push(holdChild(item, flushed.promise));
          } else {
            busy.delete(item);
            item.inBusy = false;
          }
        }
      }
      if (flushed) rawBarrier = flushed.promise;
      if (partBarrier) {
        partBarriers++;
        latestPartBarrier = flushed!.promise;
      }

      // Match the readiness ordering of the one-chunk streams this replaces.
      void Promise.resolve()
        .then(async () => {
          if (previous) await previous;
          if (reached.length > 0) await Promise.all(reached);
          pendingRawBatches--;
          if (rawChunkBatch === batch) rawChunkBatch = undefined;
          if (cancelled || errored) return;

          for (const { chunk: rawChunk, partIndex } of batch) {
            if (rawChunk.type === "part-start" && rawChunk.path.length === 0) {
              const index = contentCounter.up();
              if (partIndex) {
                pendingPartIndexes.delete(partIndex);
                partIndex.reference.value = index;
                partIndex.resolve(index);
              }
            }
            controller.enqueue(rawChunk);
          }
          if (sealed && list.size === 0 && pendingRawBatches === 0) {
            controller.close();
          }

          currentPull?.resolve();
          currentPull = undefined;
        })
        .catch(handleError)
        .finally(() => {
          if (!flushed) return;
          flushed.resolve();
          if (rawBarrier === flushed.promise) rawBarrier = undefined;
        });
    }

    rawChunkBatch.push({ chunk, partIndex });
    if (waitForPartWrites) rawChunkBatch = undefined;
  };

  const addStream = (
    stream: ReadableStream<AssistantStreamChunk>,
    pipeTask?: Promise<unknown>,
    options?: MergeStreamOptions,
  ) => {
    const handledPipeTask = pipeTask?.catch(() => undefined);
    if (cancelled || errored) {
      void stream.cancel().catch(() => undefined);
      return;
    }

    if (sealed) {
      void stream.cancel().catch(() => undefined);
      throw new Error("Cannot add streams after the run callback has settled.");
    }

    // A ready child must stay ahead of raw chunks enqueued after it.
    rawChunkBatch = undefined;
    const item: MergeStreamItem = {
      seq: nextSeq++,
      reader: stream.getReader(),
      pipeTask: handledPipeTask,
      orderedFinish: options?.orderedFinish,
      written: options?.written,
      delivered: 0,
      idleAt: partBarriers,
      inBusy: false,
      gate: rawBarrier,
      holds: [],
      pathMapper:
        options?.pathTransform === "merge"
          ? createPathMergeMapper(() => contentCounter.up())
          : undefined,
    };
    list.add(item);
    const { written } = item;
    if (written) {
      countedItems++;
      written.onWrite = () => noteWrite(item);
      if (written.count > 0) {
        item.inBusy = true;
        busy.add(item);
      }
    }
    handlePull(item);
  };

  return {
    readable,
    isSealed() {
      return sealed;
    },
    isCancelled() {
      return cancelled;
    },
    isErrored() {
      return errored;
    },
    seal() {
      if (sealed || cancelled || errored) return;
      sealed = true;
      if (list.size === 0 && pendingRawBatches === 0) controller.close();
    },
    addStream,
    enqueuePartStart(chunk: AssistantStreamChunk) {
      if (cancelled || errored)
        return { value: -1, promise: Promise.resolve(-1) };
      if (sealed) {
        throw new Error(
          "Cannot add streams after the run callback has settled.",
        );
      }

      const deferred = promiseWithResolvers<number>();
      const reference: PartIndexReference = {
        value: undefined as number | undefined,
        promise: deferred.promise,
      };
      const reservation = { reference, resolve: deferred.resolve };
      pendingPartIndexes.add(reservation);
      enqueueRawChunk(chunk, reservation);
      return reference;
    },
    enqueue(chunk: AssistantStreamChunk) {
      if (cancelled || errored) return;
      if (sealed) {
        throw new Error(
          "Cannot add streams after the run callback has settled.",
        );
      }

      enqueueRawChunk(chunk);
    },
  };
};

// TODO
// export class SpanContainerMerger {
//   public get isSealed() {
//     return this.mergeStream.isSealed();
//   }

//   public get readable() {
//     return this.mergeStream.readable;
//   }

//   private subAllocator = new Counter();
//   private mergeStream = createMergeStream();

//   constructor() {
//     // id 0 is auto allocated
//     this.subAllocator.up();
//   }

//   add(stream: ReadableStream<AssistantStreamChunk>) {
//     this.mergeStream.addStream(
//       stream.pipeThrough(new SpanParentEncoder(this.subAllocator)),
//     );
//   }

//   enqueue(chunk: AssistantStreamChunk & { parentId: 0 }) {
//     this.mergeStream.addStream(
//       new ReadableStream({
//         start(c) {
//           c.enqueue(chunk);
//           c.close();
//         },
//       }),
//     );
//   }

//   seal() {
//     this.mergeStream.seal();
//   }
// }

// export class SpanContainerSplitter {
//   public writable;

//   private isSealed = false;
//   private writers = new Map<
//     number,
//     WritableStreamDefaultWriter<AssistantStreamChunk>
//   >();

//   private closeTasks: Promise<void>[] = [];

//   private allocator = new Counter();
//   private subAllocator = new Counter();

//   constructor() {
//     // id 0 is auto-allocated
//     this.allocator.up();

//     this.writable = new WritableStream({
//       write: (chunk) => {
//         const { type, parentId } = chunk;

//         const writer = this.writers.get(parentId);
//         if (writer === undefined) throw new Error("Parent id not found");

//         writer.write(chunk);

//         if (type === "span") {
//           // allocate a new span id
//           this.writers.set(this.allocator.up(), writer);
//         }
//         if (type === "finish") {
//           this.writers.delete(parentId);
//           writer.close();

//           if (this.writers.size === 0) {
//             const closeTask = this.writable.close();
//             this.closeTasks.push(closeTask);
//             closeTask.then(() => {
//               this.closeTasks.splice(this.closeTasks.indexOf(closeTask), 1);
//             });
//           }
//         }
//       },
//       close: async () => {
//         if (this.writers.size > 0) throw new Error("Not all writers closed");

//         // await and throw on any errors
//         await Promise.all(this.closeTasks);
//       },
//     });
//   }

//   add(stream: WritableStream<AssistantStreamChunk>) {
//     if (this.isSealed) throw new Error("Cannot add streams after sealing");

//     const decoder = new SpanParentDecoder(this.subAllocator);
//     decoder.readable.pipeTo(stream);

//     this.writers.set(this.allocator.up(), decoder.writable.getWriter());
//   }

//   seal() {
//     this.isSealed = true;
//     if (this.writers.size === 0) this.writable.close();
//   }
// }
