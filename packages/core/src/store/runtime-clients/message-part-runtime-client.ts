import { resource } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import type { MessagePartRuntime } from "../../runtime/api/message-part-runtime";
import { useSubscribable } from "./useSubscribable";

const useMessagePartClient = ({
  runtime,
}: {
  runtime: MessagePartRuntime;
}): ClientOutput<"part"> => {
  const state = useSubscribable(runtime);
  const unstable_recordInteraction = runtime.unstable_recordInteraction;

  return {
    getState: () => state,
    addToolResult: (result) => runtime.addToolResult(result),
    resumeToolCall: (payload) => runtime.resumeToolCall(payload),
    respondToToolApproval: (response) =>
      runtime.respondToToolApproval(response),
    ...(unstable_recordInteraction && { unstable_recordInteraction }),
    __internal_getRuntime: () => runtime,
  };
};

export const MessagePartClient = resource(useMessagePartClient);
