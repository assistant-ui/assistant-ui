"use client";

import { forwardRef, useCallback } from "react";
import { ActionButtonProps } from "../../utils/createActionButton";
import { composeEventHandlers } from "@radix-ui/primitive";
import { Primitive } from "@radix-ui/react-primitive";
import { useAssistantState, useAssistantApi } from "../../context";

const useActionBarExport = ({
  onExport,
}: {
  onExport: (content: string) => void | Promise<void>;
}) => {
  const api = useAssistantApi();
  const hasExportableContent = useAssistantState(({ message }) => {
    return (
      (message.role !== "assistant" || message.status?.type !== "running") &&
      message.parts.some((c) => c.type === "text" && c.text.length > 0)
    );
  });

  const callback = useCallback(() => {
    const content = api.message().getCopyText();
    if (content) onExport(content);
  }, [api, onExport]);

  if (!hasExportableContent) return null;
  return callback;
};

export namespace ActionBarPrimitiveExport {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarExport>;
}

export const ActionBarPrimitiveExport = forwardRef<
  ActionBarPrimitiveExport.Element,
  ActionBarPrimitiveExport.Props
>(({ onExport, onClick, disabled, ...props }, forwardedRef) => {
  const callback = useActionBarExport({ onExport });
  return (
    <Primitive.button
      type="button"
      {...props}
      ref={forwardedRef}
      disabled={disabled || !callback}
      onClick={composeEventHandlers(onClick, () => {
        callback?.();
      })}
    />
  );
});

ActionBarPrimitiveExport.displayName = "ActionBarPrimitive.Export";

