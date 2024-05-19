import { useAssistantContext } from "../utils/context/AssistantContext";
import { useMessageContext } from "../utils/context/MessageContext";

export const useReloadMessage = () => {
  const { useThread, useBranchObserver } = useAssistantContext();
  const { useMessage } = useMessageContext();

  // TODO compose into one hook call
  const isLoading = useThread((s) => s.isLoading);
  const isAssistant = useMessage((s) => s.message.role === "assistant");

  if (isLoading || !isAssistant) return null;

  return () => {
    const message = useMessage.getState().message;
    if (message.role !== "assistant")
      throw new Error("Reloading is only supported on assistant messages");

    useBranchObserver.getState().reloadAt(message);
  };
};
