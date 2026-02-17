import { resource } from "@assistant-ui/tap";
import { type ClientOutput } from "../";
import { MessagePartRuntime } from "../../runtime";
import { tapSubscribable } from "../utils/tap-subscribable";

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
