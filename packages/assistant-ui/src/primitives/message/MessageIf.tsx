"use client";
import { FC } from "react";
import {
  useIsEditingContext,
  useMessageContext,
  useThreadContext,
} from "../../utils/context/Context";
import { RequireAtLeastOne } from "../../utils/RequireAtLeastOne";

type MessageIfFilters = {
  user: boolean | undefined;
  assistant: boolean | undefined;
  editing: boolean | undefined;
  first: boolean | undefined;
  last: boolean | undefined;
  hasBranches: boolean | undefined;
};

type MessageIfProps = RequireAtLeastOne<MessageIfFilters> & {
  children: React.ReactNode;
};

const useMessageIf = (props: RequireAtLeastOne<MessageIfFilters>) => {
  const message = useMessageContext();
  const [isEditing] = useIsEditingContext();
  const thread = useThreadContext();

  const { branchCount } = thread.getBranchState(message);

  if (props.hasBranches === true && branchCount < 2) return false;

  if (props.user && message.role !== "user") return false;
  if (props.assistant && message.role !== "assistant") return false;

  if (props.editing === true && isEditing === false) return false;
  if (props.editing === false && isEditing !== false) return false;

  if (props.first && thread.messages[0].id !== message.id) return false;
  if (
    props.last &&
    thread.messages[thread.messages.length - 1].id !== message.id
  )
    return false;

  return true;
};

export const MessageIf: FC<MessageIfProps> = ({ children, ...query }) => {
  const result = useMessageIf(query);
  return result ? children : null;
};
