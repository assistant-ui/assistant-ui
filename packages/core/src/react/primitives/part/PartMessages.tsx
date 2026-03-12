import { type FC, memo } from "react";
import { useAuiState } from "@assistant-ui/store";
import type { ThreadMessage } from "../../../types";
import { ReadonlyThreadProvider } from "../../providers/ReadonlyThreadProvider";
import {
  ThreadPrimitiveMessages,
  ThreadPrimitiveMessagesImpl,
} from "../thread/ThreadMessages";

export namespace PartPrimitiveMessages {
  export type Props = {
    components: ThreadPrimitiveMessages.Props["components"];
  };
}

const usePartMessages = (): readonly ThreadMessage[] | undefined => {
  return useAuiState((s) => {
    const part = s.part;
    if (part.type !== "tool-call") return undefined;
    return "messages" in part
      ? (part.messages as readonly ThreadMessage[] | undefined)
      : undefined;
  });
};

/**
 * Renders the nested messages of a tool call part (e.g. sub-agent conversation).
 *
 * This primitive reads `messages` from the current tool call part in the PartScope
 * and renders them using a readonly thread context. All existing message and part
 * primitives work inside, and parent tool UI registrations are inherited.
 *
 * @example
 * ```tsx
 * const SubAgentToolUI = makeAssistantToolUI({
 *   toolName: "invoke_sub_agent",
 *   render: () => (
 *     <PartPrimitive.Messages
 *       components={{
 *         UserMessage: MyUserMessage,
 *         AssistantMessage: MyAssistantMessage,
 *       }}
 *     />
 *   ),
 * });
 * ```
 */
export const PartPrimitiveMessagesImpl: FC<PartPrimitiveMessages.Props> = ({
  components,
}) => {
  const messages = usePartMessages();

  if (!messages?.length) return null;

  return (
    <ReadonlyThreadProvider messages={messages}>
      <ThreadPrimitiveMessagesImpl components={components} />
    </ReadonlyThreadProvider>
  );
};

PartPrimitiveMessagesImpl.displayName = "PartPrimitive.Messages";

export const PartPrimitiveMessages = memo(PartPrimitiveMessagesImpl);
