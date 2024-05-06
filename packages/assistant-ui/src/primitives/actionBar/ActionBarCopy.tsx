"use client";

import { useMessageContext } from "../../utils/context/MessageContext";
import { createActionButton } from "../../utils/createActionButton";

export const ActionBarCopy = createActionButton(() => {
  const messageContent = useMessageContext(
    "ActionBar.Copy",
    (s) => s.message.content,
  );
  return {
    onClick: () => {
      navigator.clipboard.writeText(messageContent);
    },
  };
});
