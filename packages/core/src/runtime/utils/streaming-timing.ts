import type { MessageTiming } from "../../types/message";

/**
 * Shape-specific accessors that adapt {@link stepStreamingTiming} /
 * {@link useStreamingTiming} to a runtime's message list. Each adapter
 * provides three pure functions over its own message type; the timing state
 * machine itself lives once in core.
 */
export type StreamingTimingAccessors<TMessage> = {
  /** Resolve the id of the last assistant message, or `undefined` if none. */
  readonly getAssistantMessageId: (
    messages: readonly TMessage[],
  ) => string | undefined;
  /** Total text length (incl. reasoning/thinking) of the assistant message. */
  readonly getTextLength: (
    messages: readonly TMessage[],
    messageId: string,
  ) => number;
  /** Number of tool calls recorded on the assistant message. */
  readonly getToolCallCount: (
    messages: readonly TMessage[],
    messageId: string,
  ) => number;
};

export type StreamingTimingOptions = {
  /**
   * Estimate token count from a text length. Defaults to `Math.ceil(n / 4)`.
   * Adapters with real usage data can override this.
   */
  readonly estimateTokens?: (textLength: number) => number;
};

/**
 * Mutable tracking state for a single in-flight assistant message. Kept
 * between updates by the caller (a ref in the React hook); `null` means no
 * message is being tracked.
 *
 * `totalChunks` counts content growth deltas observed while streaming. The
 * final delta that lands in the same update as the `isRunning -> false`
 * transition is reconciled at finalize, so `totalChunks` and the token
 * estimate (derived from final length) count the same content.
 */
export type StreamingTimingState = {
  readonly messageId: string;
  readonly startTime: number;
  readonly firstTokenTime?: number;
  readonly lastContentLength: number;
  readonly totalChunks: number;
};

const defaultEstimateTokens = (textLength: number): number =>
  Math.ceil(textLength / 4);

/**
 * Apply one content growth delta to `state`, recording the first-token time
 * on the first growth and bumping the chunk count. Returns `state` unchanged
 * when `len` has not grown.
 */
const applyGrowth = (
  state: StreamingTimingState,
  len: number,
  now: () => number,
): StreamingTimingState => {
  if (len <= state.lastContentLength) return state;
  return {
    ...state,
    firstTokenTime: state.firstTokenTime ?? now() - state.startTime,
    lastContentLength: len,
    totalChunks: state.totalChunks + 1,
  };
};

/**
 * Advance the client-side streaming timing tracker by one update.
 *
 * Pure: given the previous state and the current `(messages, isRunning)`
 * snapshot, returns the next state plus any `MessageTiming` finalized this
 * update (empty when streaming is still in flight). The caller owns the
 * state (e.g. a ref) and merges finalized timings into its store.
 *
 * At finalize the text length is recomputed from the final messages, and any
 * final growth delta that landed in the same update as the
 * `isRunning -> false` transition is reconciled, so the token estimate and
 * `totalChunks` count the same content (the per-adapter hooks this replaces
 * reuse a stale growth delta and miss that last chunk).
 */
export const stepStreamingTiming = <TMessage>(
  state: StreamingTimingState | null,
  messages: readonly TMessage[],
  isRunning: boolean,
  accessors: StreamingTimingAccessors<TMessage>,
  options: StreamingTimingOptions | undefined,
  now: () => number = Date.now,
): {
  readonly state: StreamingTimingState | null;
  readonly timings: Record<string, MessageTiming>;
} => {
  const lastId = accessors.getAssistantMessageId(messages);
  const estimateTokens = options?.estimateTokens ?? defaultEstimateTokens;

  if (isRunning && lastId !== undefined) {
    let next: StreamingTimingState;
    if (state === null || state.messageId !== lastId) {
      next = {
        messageId: lastId,
        startTime: now(),
        lastContentLength: 0,
        totalChunks: 0,
      };
    } else {
      next = state;
    }

    return {
      state: applyGrowth(
        next,
        accessors.getTextLength(messages, next.messageId),
        now,
      ),
      timings: {},
    };
  }

  if (!isRunning && state !== null) {
    const nowMs = now();
    // Reconcile any final growth that landed with the stop signal so the
    // token estimate (derived from final length) and totalChunks agree.
    const reconciled = applyGrowth(
      state,
      accessors.getTextLength(messages, state.messageId),
      () => nowMs,
    );

    const totalStreamTime = nowMs - reconciled.startTime;
    const tokenCount = estimateTokens(reconciled.lastContentLength);
    const toolCallCount = accessors.getToolCallCount(
      messages,
      reconciled.messageId,
    );

    const timing: MessageTiming = {
      streamStartTime: reconciled.startTime,
      totalStreamTime,
      totalChunks: reconciled.totalChunks,
      toolCallCount,
      ...(reconciled.firstTokenTime !== undefined && {
        firstTokenTime: reconciled.firstTokenTime,
      }),
      ...(tokenCount > 0 && { tokenCount }),
      ...(totalStreamTime > 0 &&
        tokenCount > 0 && {
          tokensPerSecond: tokenCount / (totalStreamTime / 1000),
        }),
    };

    return { state: null, timings: { [reconciled.messageId]: timing } };
  }

  return { state, timings: {} };
};
