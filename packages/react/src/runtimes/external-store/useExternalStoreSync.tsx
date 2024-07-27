import { useEffect, useInsertionEffect, useMemo, useRef } from "react";
import { ExternalStoreAdapter } from "./ExternalStoreAdapter";
import {
  ConverterCallback,
  ThreadMessageConverter,
} from "./ThreadMessageConverter";
import { ThreadMessage } from "../../types";
import { symbolInnerMessage } from "./getExternalStoreMessage";
import { getAutoStatus } from "./auto-status";
import { fromThreadMessageLike } from "./ThreadMessageLike";

type UpdateDataCallback = (
  isDisabled: boolean,
  isRunning: boolean,
  messages: ThreadMessage[],
) => void;

export const useExternalStoreSync = <T extends WeakKey>(
  adapter: ExternalStoreAdapter<T>,
  updateData: UpdateDataCallback,
) => {
  const adapterRef = useRef(adapter);
  useInsertionEffect(() => {
    adapterRef.current = adapter;
  });

  // flush the converter cache when the convertMessage prop changes
  const [converter, convertCallback] = useMemo(() => {
    const converter = adapter.convertMessage ?? ((m: T) => m as ThreadMessage);
    const convertCallback: ConverterCallback<T> = (cache, m, idx) => {
      const autoStatus = getAutoStatus(
        adapterRef.current.messages.at(-1) === m,
        adapterRef.current.isRunning ?? false,
      );

      if (cache && (cache.role !== "assistant" || cache.status === autoStatus))
        return cache;

      const newMessage = fromThreadMessageLike(
        converter(m, idx),
        idx.toString(),
        autoStatus,
      );
      (newMessage as any)[symbolInnerMessage] = m;
      return newMessage;
    };
    return [new ThreadMessageConverter(), convertCallback];

    // specify convertMessage bceause we want the ThreadMessageConverter to be recreated when the adapter changes
  }, [adapter.convertMessage]);

  useEffect(() => {
    updateData(
      adapter.isDisabled ?? false,
      adapter.isRunning ?? false,
      converter.convertMessages(adapter.messages, convertCallback),
    );
  }, [
    updateData,
    converter,
    convertCallback,
    adapter.isDisabled,
    adapter.isRunning,
    adapter.messages,
  ]);
};
