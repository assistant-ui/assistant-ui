import { useLocalRuntime } from "..";
import { useState } from "react";
import { EdgeRuntimeOptions, EdgeChatAdapter } from "./EdgeChatAdapter";

export const useEdgeRuntime = (options: EdgeRuntimeOptions) => {
  const [adapter] = useState(() => new EdgeChatAdapter(options));
  return useLocalRuntime(adapter);
};
