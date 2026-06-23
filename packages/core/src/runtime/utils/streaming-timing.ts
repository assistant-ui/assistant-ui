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
 * Advance the client-side streaming timing tracker by one update.
 *
 * Pure: given the previous state and the current `(messages, isRunning)`
 * snapshot, returns the next state plus any `MessageTiming` finalized this
 * update (empty when streaming is still in flight). The caller owns the
 * state (e.g. a ref) and merges finalized timings into its store.
 *
 * Unlike the per-adapter hooks this replaces, the token estimate at finalize
 * is recomputed from the final messages rather than the last observed growth
 * delta, so the final content chunk (which often lands in the same render as
 * the `isRunning -> false` transition) is counted.
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

    const len = accessors.getTextLength(messages, next.messageId);
    if (len > next.lastContentLength) {
      return {
        state: {
          ...next,
          firstTokenTime: next.firstTokenTime ?? now() - next.startTime,
          lastContentLength: len,
          totalChunks: next.totalChunks + 1,
        },
        timings: {},
      };
    }
    return { state: next, timings: {} };
  }

  if (!isRunning && state !== null) {
    const totalStreamTime = now() - state.startTime;
    // Recompute text length from the final messages rather than reusing the
    // last growth delta, so the final chunk that lands with the
    // `isRunning -> false` transition is included in the token estimate.
    const finalLength = accessors.getTextLength(messages, state.messageId);
    const tokenCount = estimateTokens(finalLength);
    const toolCallCount = accessors.getToolCallCount(messages, state.messageId);

    const timing: MessageTiming = {
      streamStartTime: state.startTime,
      totalStreamTime,
      totalChunks: state.totalChunks,
      toolCallCount,
      ...(state.firstTokenTime !== undefined && {
        firstTokenTime: state.firstTokenTime,
      }),
      ...(tokenCount > 0 && { tokenCount }),
      ...(totalStreamTime > 0 &&
        tokenCount > 0 && {
          tokensPerSecond: tokenCount / (totalStreamTime / 1000),
        }),
    };

    return { state: null, timings: { [state.messageId]: timing } };
  }

  return { state, timings: {} };
};
