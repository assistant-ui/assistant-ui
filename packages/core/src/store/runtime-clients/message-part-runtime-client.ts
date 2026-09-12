import { resource } from "@assistant-ui/tap";
import { resolveToolApprovalResponse } from "../../runtime/utils/resolveToolApprovalResponse";
import type { ClientOutput } from "@assistant-ui/store";
import type { MessagePartRuntime } from "../../runtime/api/message-part-runtime";
import type { PartEvents } from "../scopes/part";
import { useSubscribable } from "./useSubscribable";

/** The message client's emitter, narrowed to the events a part emits. */
export type PartEventEmitter = <TEvent extends keyof PartEvents>(
  event: TEvent,
  payload: PartEvents[TEvent],
) => void;

const useMessagePartClient = ({
  runtime,
  eventContext,
}: {
  runtime: MessagePartRuntime;
  /**
   * Identity and emitter for events, owned by the message client so this
   * resource reads no tap context and keeps its useResources bailout; absent
   * in hand-built clients. The refs are read at emit time.
   */
  eventContext?: {
    threadIdRef: { current: string };
    messageIdRef: { current: string };
    emit: PartEventEmitter;
  };
}): ClientOutput<"part"> => {
  const state = useSubscribable(runtime);

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
        eventContext.emit("part.toolApprovalResponded", {
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
