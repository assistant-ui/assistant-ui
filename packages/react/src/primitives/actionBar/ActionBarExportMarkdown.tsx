"use client";

import { forwardRef, useCallback } from "react";
import { ActionButtonProps } from "../../utils/createActionButton";
import { composeEventHandlers } from "@radix-ui/primitive";
import { Primitive } from "@radix-ui/react-primitive";
import { useAssistantState, useAssistantApi } from "../../context";

const useActionBarExportMarkdown = ({
  filename,
  onExport,
}: {
  filename?: string | undefined;
  onExport?: ((content: string) => void | Promise<void>) | undefined;
} = {}) => {
  const api = useAssistantApi();
  const hasExportableContent = useAssistantState(({ message }) => {
    return (
      (message.role !== "assistant" || message.status?.type !== "running") &&
      message.parts.some((c) => c.type === "text" && c.text.length > 0)
    );
  });

  const callback = useCallback(async () => {
    const content = api.message().getCopyText();
    if (!content) return;

    if (onExport) {
      await onExport(content);
      return;
    }

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? `message-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [api, filename, onExport]);

  if (!hasExportableContent) return null;
  return callback;
};

export namespace ActionBarPrimitiveExportMarkdown {
  export type Element = HTMLButtonElement;
  export type Props = ActionButtonProps<typeof useActionBarExportMarkdown>;
}

export const ActionBarPrimitiveExportMarkdown = forwardRef<
  ActionBarPrimitiveExportMarkdown.Element,
  ActionBarPrimitiveExportMarkdown.Props
>(({ filename, onExport, onClick, disabled, ...props }, forwardedRef) => {
  const callback = useActionBarExportMarkdown({ filename, onExport });
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

ActionBarPrimitiveExportMarkdown.displayName =
  "ActionBarPrimitive.ExportMarkdown";
