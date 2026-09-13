import { resource } from "@assistant-ui/tap";
import { useAssistantEmit } from "@assistant-ui/store/client";
import { resolveToolApprovalResponse } from "../../runtime/utils/resolveToolApprovalResponse";
import type { ClientOutput } from "@assistant-ui/store";
import type { MessagePartRuntime } from "../../runtime/api/message-part-runtime";
import { useSubscribable } from "./useSubscribable";

const useMessagePartClient = ({
  runtime,
  eventContext,
}: {
  runtime: MessagePartRuntime;
  /**
   * Thread and message identity for emitted events, read at emit time; absent
   * in hand-built clients.
   */
  eventContext?: {
    threadIdRef: { current: string };
    messageIdRef: { current: string };
  };
}): ClientOutput<"part"> => {
  const state = useSubscribable(runtime);
  // Emitted with this part's own client stack so part-scope listeners match.
  // The tap context this reads is memoized at the root, so it does not cost
  // this resource its useResources bailout (see the render test).
  const emit = useAssistantEmit();

  return {
    getState: () => state,
    addToolResult: (result) => runtime.addToolResult(result),
    resumeToolCall: (payload) => runtime.resumeToolCall(payload),
    respondToToolApproval: (response) => {
      const part = runtime.getState();
      return runtime.respondToToolApproval(response).then(() => {
        // Emitted for every accepted response (see PartEvents): the runtime
        // rejects a response once the gate is decided, and consumers that
        // must count once per gate dedupe by threadId and approvalId.
        if (!eventContext || part.type !== "tool-call" || !part.approval)
          return;
        emit("part.toolApprovalResponded", {
          threadId: eventContext.threadIdRef.current,
          messageId: eventContext.messageIdRef.current,
          toolCallId: part.toolCallId,
          approvalId: part.approval.id,
          approved: resolveToolApprovalResponse(part.approval, response)
            .approved,
        });
      });
    },
    __internal_getRuntime: () => runtime,
  };
};

export const MessagePartClient = resource(useMessagePartClient);
