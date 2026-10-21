import { useMemo } from "react";
import {
  InMemoryThreadListAdapter,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
  type LocalRuntimeOptions,
} from "@assistant-ui/react";

type SampleRuntimeOptions = Pick<
  LocalRuntimeOptions,
  "initialMessages" | "adapters"
>;

export function useSampleRuntime(
  chatModel: ChatModelAdapter,
  options: SampleRuntimeOptions = {},
) {
  const adapter = useMemo(() => new InMemoryThreadListAdapter(), []);

  return useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function SampleRuntimeHook() {
      return useLocalRuntime(chatModel, options);
    },
  });
}
