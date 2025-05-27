import { EdgeRuntimeOptions, useEdgeRuntime } from "@assistant-ui/react-edge";

export type UseChatRuntimeOptions = Omit<
  EdgeRuntimeOptions,
  "unstable_AISDKInterop"
>;

export const useChatRuntime = (options: UseChatRuntimeOptions) => {
  return useEdgeRuntime({
    ...options,
    unstable_AISDKInterop: "v2",
  });
};
