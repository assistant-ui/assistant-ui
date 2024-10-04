import { LocalRuntimeOptions, useLocalRuntime } from "..";
import { useState } from "react";
import { EdgeChatAdapterOptions, EdgeChatAdapter } from "./EdgeChatAdapter";
import { splitLocalRuntimeOptions } from "../local/LocalRuntimeOptions";

export type EdgeRuntimeOptions = EdgeChatAdapterOptions & LocalRuntimeOptions;

export const useEdgeRuntime = (options: EdgeRuntimeOptions) => {
  const { localRuntimeOptions, otherOptions } =
    splitLocalRuntimeOptions(options);
  const [adapter] = useState(() => new EdgeChatAdapter(otherOptions));
  return useLocalRuntime(adapter, localRuntimeOptions);
};
