import type { ChatModelRunResult } from "@assistant-ui/core";
import type { ReadonlyJSONValue } from "assistant-stream/utils";
import jsonpatch, { type Operation } from "fast-json-patch";
import { makeLogger, type Logger } from "../logger";
import type { AgUiEvent } from "../types";
import { RunAggregator } from "./run-aggregator";

export type CreateAgUiResumeStreamOptions = {
  showThinking?: boolean;
  logger?: Partial<Logger>;
};

/**
 * Turn a stream of AG-UI events into the `ChatModelRunResult` snapshots that a
 * `ThreadHistoryAdapter.resume()` (or any `ChatModelAdapter`) yields.
 *
 * This is the read-only counterpart to a live run: instead of invoking the
 * agent, feed already-produced events (e.g. replayed from a durable/resumable
 * transport at a cursor) and re-use the same `RunAggregator` the live runtime
 * uses, so resumed runs render identically without re-running the model.
 *
 * `STATE_SNAPSHOT` / `STATE_DELTA` are folded into `metadata.unstable_state`;
 * `MESSAGES_SNAPSHOT` is ignored here (history is hydrated on load()).
 */
export async function* createAgUiResumeStream(
  events: AsyncIterable<AgUiEvent>,
  options: CreateAgUiResumeStreamOptions = {},
): AsyncGenerator<ChatModelRunResult, void, unknown> {
  const logger = makeLogger(options.logger);
  let pending: ChatModelRunResult[] = [];
  const aggregator = new RunAggregator({
    showThinking: options.showThinking ?? true,
    logger,
    emit: (update) => pending.push(update),
  });

  let stateSnapshot: ReadonlyJSONValue | undefined;

  for await (const event of events) {
    switch (event.type) {
      case "STATE_SNAPSHOT": {
        stateSnapshot = event.snapshot as ReadonlyJSONValue;
        yield { metadata: { unstable_state: stateSnapshot } };
        continue;
      }
      case "STATE_DELTA": {
        if (event.delta.length === 0) continue;
        try {
          const result = jsonpatch.applyPatch(
            stateSnapshot ?? {},
            event.delta as Operation[],
            /* validateOperation */ true,
            /* mutateDocument */ false,
          );
          stateSnapshot = result.newDocument as ReadonlyJSONValue;
          yield { metadata: { unstable_state: stateSnapshot } };
        } catch (error) {
          logger.error?.("[agui] failed to apply state delta on resume", error);
        }
        continue;
      }
      case "MESSAGES_SNAPSHOT":
        continue;
      default:
        aggregator.handle(event);
    }
    if (pending.length > 0) {
      const batch = pending;
      pending = [];
      for (const update of batch) yield update;
    }
  }
}
