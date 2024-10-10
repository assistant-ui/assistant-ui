import { useCallback } from "react";

import { useMessage, useMessageRuntime } from "../../context";

export const useActionBarSpeak = () => {
  const messageRunime = useMessageRuntime();
  const callback = useCallback(async () => {
    messageRunime.speak();
  }, [messageRunime]);

  const hasSpeakableContent = useMessage((m) => {
    return (
      (m.role !== "assistant" || m.status.type !== "running") &&
      m.content.some((c) => c.type === "text" && c.text.length > 0)
    );
  });

  if (!hasSpeakableContent) return null;
  return callback;
};
