"use client";

import { useCallback } from "react";
import { useAuiState, useAui } from "@assistant-ui/store";
import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";

const useActionBarSpeak = () => {
  const aui = useAui();
  const callback = useCallback(async () => {
    aui.message().speak();
  }, [aui]);

  const hasSpeakableContent = useAuiState((s) => {
    return (
      (s.message.role !== "assistant" ||
        s.message.status?.type !== "running") &&
      s.message.parts.some((c) => c.type === "text" && c.text.length > 0)
    );
  });

  if (!hasSpeakableContent) return null;
  return callback;
};

export namespace ActionBarPrimitiveSpeak {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarSpeak>;
}

export const ActionBarPrimitiveSpeak = createActionButton(
  "ActionBarPrimitive.Speak",
  useActionBarSpeak,
);
