"use client";

import { useMemo, useState } from "react";
import {
  convertExternalMessages as convertExternalMessagesInternal,
  createExternalMessageConversionCache as createExternalMessageConversionCacheInternal,
  type ExternalMessageConverterCallback,
  type ExternalMessageConverterMessage,
  type ExternalMessageConverterMetadata,
  type InternalExternalMessageConversionCache,
  type JoinStrategy,
} from "../../runtime/utils/external-message-conversion";
import { bindExternalStoreMessage } from "../../runtime/utils/external-store-message";

export type { JoinStrategy };
export type ExternalMessageConversionCache = {
  readonly __brand: unique symbol;
};

/**
 * Creates a cache for plain external message conversion. Pass the same cache on every call for one message list, and a source message that has not changed since the previous call converts to the same `ThreadMessage` object.
 *
 * Entries are keyed by source message identity and rebuilt whenever `callback` or `metadata` is a different object than on the previous call, so keep both referentially stable.
 */
export const createExternalMessageConversionCache =
  (): ExternalMessageConversionCache =>
    createExternalMessageConversionCacheInternal() as unknown as ExternalMessageConversionCache;

export namespace useExternalMessageConverter {
  export type Message = ExternalMessageConverterMessage;
  export type Metadata = ExternalMessageConverterMetadata;
  export type Callback<T> = ExternalMessageConverterCallback<T>;
}

export const convertExternalMessages = <T extends WeakKey>(
  messages: T[],
  callback: useExternalMessageConverter.Callback<T>,
  isRunning: boolean,
  metadata: useExternalMessageConverter.Metadata,
  cache?: ExternalMessageConversionCache,
) =>
  convertExternalMessagesInternal(
    messages,
    callback,
    isRunning,
    metadata,
    undefined,
    cache as unknown as InternalExternalMessageConversionCache<T> | undefined,
  );

export const useExternalMessageConverter = <T extends WeakKey>({
  callback,
  messages,
  isRunning,
  joinStrategy,
  metadata,
}: {
  callback: useExternalMessageConverter.Callback<T>;
  messages: T[];
  isRunning: boolean;
  joinStrategy?: JoinStrategy | undefined;
  metadata?: useExternalMessageConverter.Metadata | undefined;
}) => {
  // The cache lives for the component lifetime: React Compiler hoists allocations without reactive dependencies out of useMemo, so entries carry the callback and metadata that produced them instead of being flushed when those change.
  const [cache] = useState(() =>
    createExternalMessageConversionCacheInternal<T>(),
  );

  const state = useMemo(
    () => ({
      metadata: metadata ?? {},
      callback,
    }),
    [callback, metadata],
  );

  return useMemo(() => {
    const threadMessages = convertExternalMessagesInternal(
      messages,
      state.callback,
      isRunning,
      state.metadata,
      joinStrategy,
      cache,
    );

    bindExternalStoreMessage(threadMessages, messages);
    return threadMessages;
  }, [state, messages, isRunning, joinStrategy, cache]);
};
