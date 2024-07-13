import { LocalRuntimeOptions, useLocalRuntime } from "..";
import { useState } from "react";
import { EdgeChatAdapterOptions, EdgeChatAdapter } from "./EdgeChatAdapter";

export type EdgeRuntimeOptions = EdgeChatAdapterOptions & LocalRuntimeOptions;

export const useEdgeRuntime = ({
  initialMessages,
  ...options
}: EdgeRuntimeOptions) => {
  const [adapter] = useState(() => new EdgeChatAdapter(options));
  return useLocalRuntime(adapter, { initialMessages });
};
