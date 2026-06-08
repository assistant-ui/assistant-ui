import { resource } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import type { MessagePartRuntime } from "../../runtime/api/message-part-runtime";
import { useSubscribable } from "./useSubscribable";

export const MessagePartClient = resource(function MessagePartClient({
  runtime,
}: {
  runtime: MessagePartRuntime;
}): ClientOutput<"part"> {
  const state = useSubscribable(runtime);

  return {
    getState: () => state,
    addToolResult: (result) => runtime.addToolResult(result),
    resumeToolCall: (payload) => runtime.resumeToolCall(payload),
    respondToToolApproval: (response) =>
      runtime.respondToToolApproval(response),
    __internal_getRuntime: () => runtime,
  };
});
