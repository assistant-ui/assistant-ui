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
   * Thread and message identity for emitted events; absent in hand-built
   * clients. `reportedApprovalIds` is owned by the thread client so a reported
   * approval stays reported when this part client remounts.
   */
  eventContext?: {
    threadId: string;
    messageIdRef: { current: string };
    reportedApprovalIds: Set<string>;
  };
}): ClientOutput<"part"> => {
  const state = useSubscribable(runtime);
  const emit = useAssistantEmit();

  return {
    getState: () => state,
    addToolResult: (result) => runtime.addToolResult(result),
    resumeToolCall: (payload) => runtime.resumeToolCall(payload),
    respondToToolApproval: (response) => {
      const part = runtime.getState();
      return runtime.respondToToolApproval(response).then(() => {
        if (
          !eventContext ||
          part.type !== "tool-call" ||
          !part.approval ||
          // A runtime whose state settles asynchronously accepts a repeat
          // decision before the gate reads as decided, so each approval
          // reports at most once.
          eventContext.reportedApprovalIds.has(part.approval.id)
        )
          return;
        eventContext.reportedApprovalIds.add(part.approval.id);
        emit("part.toolApprovalResponded", {
          threadId: eventContext.threadId,
          messageId: eventContext.messageIdRef.current,
          toolCallId: part.toolCallId,
          approved: resolveToolApprovalResponse(part.approval, response)
            .approved,
        });
      });
    },
    __internal_getRuntime: () => runtime,
  };
};

export const MessagePartClient = resource(useMessagePartClient);
