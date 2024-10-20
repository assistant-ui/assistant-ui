import { LocalRuntimeOptions, useLocalRuntime } from "..";
import { EdgeChatAdapterOptions, EdgeChatAdapter } from "./EdgeChatAdapter";
import { splitLocalRuntimeOptions } from "../local/LocalRuntimeOptions";

export type EdgeRuntimeOptions = EdgeChatAdapterOptions & LocalRuntimeOptions;

export const useEdgeRuntime = (options: EdgeRuntimeOptions) => {
  const { localRuntimeOptions, otherOptions } =
    splitLocalRuntimeOptions(options);

  return useLocalRuntime(
    new EdgeChatAdapter(otherOptions),
    localRuntimeOptions,
  );
};
