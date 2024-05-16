import { useMessageContext } from "../utils/context/MessageContext";
import { useThreadContext } from "../utils/context/ThreadContext";

export const useReloadMessage = () => {
  const [isLoading, reloadAt] = useThreadContext("ActionBar.Reload", (s) => [
    s.chat.isLoading,
    s.chat.reloadAt,
  ]);
  const message = useMessageContext("ActionBar.Reload", (s) => {
    const message = s.message;
    if (message.role !== "assistant" || isLoading) return null;
    return message;
  });

  if (!message) return null;
  return () => reloadAt(message);
};
