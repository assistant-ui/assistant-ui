import { useCallback } from "react";
import {
  useMessage,
  useMessageRuntime,
  useMessageUtils,
} from "../../context/react/MessageContext";
import { useComposerRuntime } from "../../context";

export type UseActionBarCopyProps = {
  copiedDuration?: number | undefined;
};

export const useActionBarCopy = ({
  copiedDuration = 3000,
}: UseActionBarCopyProps = {}) => {
  const messageRuntime = useMessageRuntime();
  const composerRuntime = useComposerRuntime();
  const setIsCopied = useMessageUtils((s) => s.setIsCopied);
  const hasCopyableContent = useMessage((message) => {
    return (
      (message.role !== "assistant" || message.status.type !== "running") &&
      message.content.some((c) => c.type === "text" && c.text.length > 0)
    );
  });

  const callback = useCallback(() => {
    const { isEditing, text: composerValue } = composerRuntime.getState();

    const valueToCopy = isEditing
      ? composerValue
      : messageRuntime.unstable_getCopyText();

    navigator.clipboard.writeText(valueToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), copiedDuration);
    });
  }, [messageRuntime, setIsCopied, composerRuntime, copiedDuration]);

  if (!hasCopyableContent) return null;
  return callback;
};
