"use client";

import { useMemo, useState } from "react";
import {
  chunkExternalMessages,
  completeExternalMessageConversion,
  convertExternalMessageCallback,
  convertExternalMessageChunk,
  convertExternalMessages as convertExternalMessagesInternal,
  shallowArrayEqual,
  type ExternalMessageConverterCallback,
  type ExternalMessageConverterCallbackResult,
  type ExternalMessageConverterChunk,
  type ExternalMessageConverterMessage,
  type ExternalMessageConverterMetadata,
  type JoinStrategy,
} from "../../runtime/utils/external-message-conversion";
import { bindExternalStoreMessage } from "../../runtime/utils/external-store-message";
import { ThreadMessageConverter } from "../../runtimes/external-store/thread-message-converter";
import type { ThreadMessage } from "../../types/message";

// Generatedness is tracked by identity, not by id shape: a caller-supplied id
// that happens to match the generated pattern must never be rewritten.
const generatedFallbackMessages = new WeakSet<object>();

export type { JoinStrategy };

export namespace useExternalMessageConverter {
  export type Message = ExternalMessageConverterMessage;
  export type Metadata = ExternalMessageConverterMetadata;
  export type Callback<T> = ExternalMessageConverterCallback<T>;
  export type GetMetadataKey<T> = (
    message: T,
    metadata: ExternalMessageConverterMetadata,
  ) => unknown;
}

export const convertExternalMessages: <T extends WeakKey>(
  messages: T[],
  callback: useExternalMessageConverter.Callback<T>,
  isRunning: boolean,
  metadata: useExternalMessageConverter.Metadata,
) => ThreadMessage[] = convertExternalMessagesInternal;

type CallbackCacheEntry<T> = ExternalMessageConverterCallbackResult<T> & {
  metadataKey: unknown;
  callback: useExternalMessageConverter.Callback<T>;
};

export const useExternalMessageConverter = <T extends WeakKey>({
  callback,
  messages,
  isRunning,
  joinStrategy,
  metadata,
  getMetadataKey,
}: {
  callback: useExternalMessageConverter.Callback<T>;
  messages: T[];
  isRunning: boolean;
  joinStrategy?: JoinStrategy | undefined;
  metadata?: useExternalMessageConverter.Metadata | undefined;
  /**
   * Returns the metadata dependency for one message. The value must change
   * whenever metadata read by the callback for that message changes and remain
   * stable while those values are unchanged. Prefer a primitive or an object
   * whose identity is preserved across renders. Defaults to the complete
   * metadata object identity.
   */
  getMetadataKey?: useExternalMessageConverter.GetMetadataKey<T> | undefined;
}) => {
  // The caches live for the component lifetime; React Compiler hoists
  // allocations without reactive dependencies out of useMemo, so re-creating
  // them on dependency change would not survive compilation. Staleness is
  // instead tracked per entry via the metadata/callback that produced it,
  // keeping correctness independent of memoization (which React treats as
  // droppable). A "use no memo" opt-out would restore the useMemo semantics
  // but leave cache flushing coupled to memo firing.
  const [caches] = useState(() => ({
    callbackCache: new WeakMap<T, CallbackCacheEntry<T>>(),
    chunkCache: new WeakMap<
      ExternalMessageConverterMessage,
      ExternalMessageConverterChunk<T>
    >(),
    converterCache: new ThreadMessageConverter(),
  }));

  const state = useMemo(
    () => ({
      metadata: metadata ?? {},
      callback,
      getMetadataKey,
      ...caches,
    }),
    [callback, metadata, getMetadataKey, caches],
  );

  return useMemo(() => {
    const callbackResults: ExternalMessageConverterCallbackResult<T>[] = [];
    for (const message of messages) {
      const metadataKey = state.getMetadataKey
        ? state.getMetadataKey(message, state.metadata)
        : state.metadata;
      let result = state.callbackCache.get(message);
      if (
        !result ||
        !Object.is(result.metadataKey, metadataKey) ||
        result.callback !== state.callback
      ) {
        result = {
          ...convertExternalMessageCallback(
            message,
            state.callback,
            state.metadata,
          ),
          metadataKey,
          callback: state.callback,
        };
        state.callbackCache.set(message, result);
      }
      callbackResults.push(result);
    }

    const chunks = chunkExternalMessages(callbackResults, joinStrategy).map(
      (message) => {
        const key = message.outputs[0];
        if (!key) return message;

        const cached = state.chunkCache.get(key);
        if (cached && shallowArrayEqual(cached.outputs, message.outputs)) {
          return cached;
        }
        state.chunkCache.set(key, message);
        return message;
      },
    );

    const threadMessages = state.converterCache.convertMessages(
      chunks,
      (cache, message, idx) =>
        convertExternalMessageChunk(
          message,
          idx,
          chunks.length,
          isRunning,
          state.metadata.error,
          {
            message: cache,
            generatedFallbackMessages,
          },
          state.metadata.cancelledMessageIds,
        ),
    );

    bindExternalStoreMessage(threadMessages, messages);
    return completeExternalMessageConversion(
      threadMessages,
      state.metadata.error,
    );
  }, [state, messages, isRunning, joinStrategy]);
};
