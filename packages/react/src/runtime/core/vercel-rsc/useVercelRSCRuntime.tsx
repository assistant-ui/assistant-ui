"use client";

import { useEffect, useInsertionEffect, useMemo, useState } from "react";
import {
  type ConverterCallback,
  ThreadMessageConverter,
} from "../../ThreadMessageConverter";
import {
  type VercelRSCThreadMessage,
  symbolInnerRSCMessage,
} from "../../vercel/VercelThreadMessage";
import {
  type VercelRSCAdapter,
  type VercelRSCMessage,
  VercelRSCRuntime,
} from "./VercelRSCRuntime";

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

export const useVercelRSCRuntime = <T extends WeakKey>(
  adapter: VercelRSCAdapter<T>,
) => {
  const [runtime] = useState(() => new VercelRSCRuntime(adapter));

  useInsertionEffect(() => {
    runtime.adapter = adapter;
  });

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
    runtime.updateData(
      converter.convertMessages(convertCallback, adapter.messages),
    );
  }, [runtime, converter, convertCallback, adapter.messages]);

  return runtime;
};
