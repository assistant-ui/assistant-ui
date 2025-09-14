import { resource } from "@assistant-ui/tap";
import { tapApi } from "../../utils/tap-store";
import { MessagePartRuntime } from "../runtime/MessagePartRuntime";
import { tapSubscribable } from "../util-hooks/tapSubscribable";
import { MessagePartClientApi } from "../../client/types/Part";
export const MessagePartClient = resource(
  ({ runtime }: { runtime: MessagePartRuntime }) => {
    const runtimeState = tapSubscribable(runtime);

    return tapApi<MessagePartClientApi>(
      {
        getState: () => runtimeState,

        addToolResult: (result) => runtime.addToolResult(result),

        __internal_getRuntime: () => runtime,
      },
      {
        key:
          runtimeState.type === "tool-call"
            ? "toolCallId-" + runtimeState.toolCallId
            : undefined,
      },
    );
  },
);
