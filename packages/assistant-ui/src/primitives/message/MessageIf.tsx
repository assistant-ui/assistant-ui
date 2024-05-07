"use client";

import { FC } from "react";
import { useMessageContext } from "../../utils/context/MessageContext";
import { useThreadContext } from "../../utils/context/ThreadContext";
import { RequireAtLeastOne } from "../../utils/RequireAtLeastOne";

type MessageIfFilters = {
  user: boolean | undefined;
  assistant: boolean | undefined;
  editing: boolean | undefined;
  hasBranches: boolean | undefined;
  copied: boolean | undefined;

  // TODO
  unstable_hoveringOrLast: boolean | undefined;
};

type MessageIfProps = RequireAtLeastOne<MessageIfFilters> & {
  children: React.ReactNode;
};

const useMessageIf = (props: RequireAtLeastOne<MessageIfFilters>) => {
  const thread = useThreadContext("Message.If", (s) => s.chat);

  return useMessageContext(
    "Message.If",
    ({ message, editState: { isEditing }, isCopied, isHovering }) => {
      const { branchCount } = thread.getBranchState(message);

      if (props.hasBranches === true && branchCount < 2) return false;

      if (props.user && message.role !== "user") return false;
      if (props.assistant && message.role !== "assistant") return false;

      if (props.editing === true && !isEditing) return false;
      if (props.editing === false && isEditing) return false;

      if (
        props.unstable_hoveringOrLast === true &&
        !isHovering &&
        thread.messages[thread.messages.length - 1]?.id !== message.id
      )
        return false;

      if (props.copied === true && !isCopied) return false;
      if (props.copied === false && isCopied) return false;

      return true;
    },
  );
};

export const MessageIf: FC<MessageIfProps> = ({ children, ...query }) => {
  const result = useMessageIf(query);
  return result ? children : null;
};
