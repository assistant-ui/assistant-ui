import { type FC, type ReactNode, memo } from "react";
import { useAuiState } from "@assistant-ui/store";
import type { ThreadMessage } from "../../../types/message";
import { ReadonlyThreadProvider } from "../../providers/ReadonlyThreadProvider";
import {
  ThreadPrimitiveMessages,
  ThreadPrimitiveMessagesImpl,
} from "../thread/ThreadMessages";

export namespace PartPrimitiveMessages {
  export type Props = {
    components?: ThreadPrimitiveMessages.Props["components"];
    /** Render function called for each message. Receives the message. */
    children?: (value: { message: ThreadMessage }) => ReactNode;
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
 *     <PartPrimitive.Messages>
 *       {({ message }) => {
 *         if (message.role === "user") return <MyUserMessage />;
 *         return <MyAssistantMessage />;
 *       }}
 *     </PartPrimitive.Messages>
 *   ),
 * });
 * ```
 */
export const PartPrimitiveMessagesImpl: FC<PartPrimitiveMessages.Props> = ({
  components,
  children,
}) => {
  const messages = usePartMessages();

  if (!messages?.length) return null;

  if (children) {
    return (
      <ReadonlyThreadProvider messages={messages}>
        <ThreadPrimitiveMessagesImpl>{children}</ThreadPrimitiveMessagesImpl>
      </ReadonlyThreadProvider>
    );
  }

  return (
    <ReadonlyThreadProvider messages={messages}>
      <ThreadPrimitiveMessagesImpl components={components!} />
    </ReadonlyThreadProvider>
  );
};

PartPrimitiveMessagesImpl.displayName = "PartPrimitive.Messages";

export const PartPrimitiveMessages = memo(PartPrimitiveMessagesImpl);
