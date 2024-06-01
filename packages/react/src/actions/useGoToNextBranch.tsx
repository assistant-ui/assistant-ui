import { useAssistantContext } from "../utils/context/AssistantContext";
import { useCombinedStore } from "../utils/context/combined/useCombinedStore";
import { useMessageContext } from "../utils/context/useMessageContext";

export const useGoToNextBranch = () => {
  const { useThread } = useAssistantContext();
  const { useMessage, useComposer } = useMessageContext();

  const disabled = useCombinedStore(
    [useMessage, useComposer],
    (m, c) =>
      c.isEditing || m.branches.indexOf(m.message.id) + 1 >= m.branches.length,
  );

  if (disabled) return null;

  return () => {
    const { message, branches } = useMessage.getState();
    useThread
      .getState()
      .switchToBranch(branches[branches.indexOf(message.id) + 1]!);
  };
};
