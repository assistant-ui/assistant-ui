"use client";

import { forwardRef, type FC } from "react";

import { CircleXIcon } from "lucide-react";
import { withDefaults } from "./utils/withDefaults";
import { useThreadConfig } from "./thread-config";
import {
  TooltipIconButton,
  TooltipIconButtonProps,
} from "./base/tooltip-icon-button";
import { useThreadContext } from "../context/react/ThreadContext";
import { useAttachmentContext } from "../context/react/AttachmentContext";

const ComposerAttachmentRoot = withDefaults("div", {
  className: "aui-composer-attachment-root",
});

ComposerAttachmentRoot.displayName = "ComposerAttachmentRoot";

const ComposerAttachment: FC = () => {
  const { useAttachment } = useAttachmentContext({ type: "composer" });
  const attachment = useAttachment((a) => a.attachment);

  return (
    <ComposerAttachmentRoot>
      .{attachment.name.split(".").pop()}
      <ComposerAttachmentRemove />
    </ComposerAttachmentRoot>
  );
};

ComposerAttachment.displayName = "ComposerAttachment";

const ComposerAttachmentRemove = forwardRef<
  HTMLButtonElement,
  Partial<TooltipIconButtonProps>
>((props, ref) => {
  const {
    strings: {
      composer: { removeAttachment: { tooltip = "Remove file" } = {} } = {},
    } = {},
  } = useThreadConfig();

  const { useComposer } = useThreadContext();
  const { useAttachment } = useAttachmentContext();
  const handleRemoveAttachment = () => {
    useComposer
      .getState()
      .removeAttachment(useAttachment.getState().attachment.id);
  };

  return (
    <TooltipIconButton
      tooltip={tooltip}
      className="aui-composer-attachment-remove"
      side="top"
      {...props}
      onClick={handleRemoveAttachment}
      ref={ref}
    >
      {props.children ?? <CircleXIcon />}
    </TooltipIconButton>
  );
});

ComposerAttachmentRemove.displayName = "ComposerAttachmentRemove";

const exports = {
  Root: ComposerAttachmentRoot,
  Remove: ComposerAttachmentRemove,
};

export default Object.assign(
  ComposerAttachment,
  exports,
) as typeof ComposerAttachment & typeof exports;
