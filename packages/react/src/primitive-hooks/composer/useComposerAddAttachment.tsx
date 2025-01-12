"use client";

import { useCallback } from "react";
import { useComposer, useComposerRuntime } from "../../context";

export namespace useComposerAddAttachment {
  export interface Options {
    /** allow selecting multiple files */
    multiple?: boolean | undefined;
  }
}

export const useComposerAddAttachment = ({
  multiple = true,
}: useComposerAddAttachment.Options = {}) => {
  const disabled = useComposer((c) => !c.isEditing);

  const composerRuntime = useComposerRuntime();
  const callback = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = multiple;

    const attachmentAccept = composerRuntime.getAttachmentAccept();
    if (attachmentAccept !== "*") {
      input.accept = attachmentAccept;
    }

    input.onchange = (e) => {
      const fileList = (e.target as HTMLInputElement).files;
      if (!fileList) return;
      for (const file of fileList) {
        composerRuntime.addAttachment(file);
      }
    };

    input.click();
  }, [composerRuntime]);

  if (disabled) return null;
  return callback;
};
