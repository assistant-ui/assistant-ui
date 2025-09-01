"use client";

import { useCallback } from "react";
import { useAssistantState, useAssistantApi } from "../../context";
import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";

const useActionBarSpeak = () => {
  const { actions } = useAssistantApi();
  const callback = useCallback(async () => {
    actions.message.speak();
  }, [actions]);

  const hasSpeakableContent = useAssistantState(({ message }) => {
    return (
      (message.role !== "assistant" || message.status?.type !== "running") &&
      message.parts.some((c) => c.type === "text" && c.text.length > 0)
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
