import { resource } from "@assistant-ui/tap";
import { tapApi } from "../../utils/tap-store";
import { MessagePartRuntime } from "../runtime/MessagePartRuntime";
import { tapSubscribable } from "../util-hooks/tapSubscribable";
import { MessagePartClientApi } from "../../client/types/Part";
export const MessagePartClient = resource(
  ({ runtime }: { runtime: MessagePartRuntime }) => {
    const runtimeState = tapSubscribable(runtime);

    const api: MessagePartClientApi = {
      getState: () => runtimeState,

      addToolResult: (result) => runtime.addToolResult(result),
      resumeToolCall: (payload) => runtime.resumeToolCall(payload),
      __internal_getRuntime: () => runtime,
    };

    return tapApi<MessagePartClientApi>(api, {
      key:
        runtimeState.type === "tool-call"
          ? "toolCallId-" + runtimeState.toolCallId
          : undefined,
    });
  },
);
