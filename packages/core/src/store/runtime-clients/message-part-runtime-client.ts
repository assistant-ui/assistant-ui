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
  /** Thread and message identity for emitted events; absent in hand-built clients. */
  eventContext?: { threadId: string; messageIdRef: { current: string } };
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
        // Emitted as a raw fact like message.copied: the runtime rejects a
        // response once the gate is decided, and consumers that must count
        // once per approval dedupe by thread and approval id themselves.
        if (!eventContext || part.type !== "tool-call" || !part.approval)
          return;
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
