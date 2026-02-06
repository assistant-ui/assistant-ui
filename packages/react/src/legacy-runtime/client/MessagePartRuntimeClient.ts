import { resource } from "@assistant-ui/tap";
import { type ClientOutput } from "@assistant-ui/store";
import { MessagePartRuntime } from "../runtime/MessagePartRuntime";
import { tapSubscribable } from "../util-hooks/tapSubscribable";

export const MessagePartClient = resource(
  ({ runtime }: { runtime: MessagePartRuntime }): ClientOutput<"part"> => {
    const state = tapSubscribable(runtime);

    return {
      getState: () => state,
      addToolResult: (result) => runtime.addToolResult(result),
      resumeToolCall: (payload) => runtime.resumeToolCall(payload),
      __internal_getRuntime: () => runtime,
    };
  },
);
