import { useEffect, useMemo } from "react";
import type {
  ThreadMessage,
  VercelRSCAdapter,
  VercelRSCMessage,
} from "../../../../dist";
import {
  type ConverterCallback,
  ThreadMessageConverter,
} from "../utils/ThreadMessageConverter";
import {
  type VercelRSCThreadMessage,
  symbolInnerRSCMessage,
} from "./getVercelRSCMessage";

const vercelToThreadMessage = <T,>(
  converter: (message: T) => VercelRSCMessage,
  rawMessage: T,
): VercelRSCThreadMessage<T> => {
  const message = converter(rawMessage);

  return {
    id: message.id,
    role: message.role,
    content: [{ type: "ui", display: message.display }],
    createdAt: message.createdAt ?? new Date(),
    ...{ status: "done" },
    [symbolInnerRSCMessage]: rawMessage,
  };
};

type UpdateDataCallback = (messages: ThreadMessage[]) => void;

export const useVercelRSCSync = <T extends WeakKey>(
  adapter: VercelRSCAdapter<T>,
  updateData: UpdateDataCallback,
) => {
  // flush the converter cache when the convertMessage prop changes
  const [converter, convertCallback] = useMemo(() => {
    const rscConverter =
      adapter.convertMessage ?? ((m: T) => m as VercelRSCMessage);
    const convertCallback: ConverterCallback<T> = (m, cache) => {
      if (cache) return cache;
      return vercelToThreadMessage(rscConverter, m);
    };
    return [new ThreadMessageConverter(), convertCallback];
  }, [adapter.convertMessage]);

  useEffect(() => {
    updateData(converter.convertMessages(adapter.messages, convertCallback));
  }, [updateData, converter, convertCallback, adapter.messages]);
};
