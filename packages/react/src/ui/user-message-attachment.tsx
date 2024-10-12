"use client";

import { type FC } from "react";

import { withDefaults } from "./utils/withDefaults";
import { AttachmentPrimitive } from "../primitives";
import { useAttachment } from "../context/react/AttachmentContext";

const UserMessageAttachmentRoot = withDefaults(AttachmentPrimitive.Root, {
  className: "aui-attachment-root",
});

UserMessageAttachmentRoot.displayName = "UserMessageAttachmentRoot";

const UserMessageAttachment: FC = () => {
  const typeLabel = useAttachment((a) => {
    const type = a.type;
    switch (type) {
      case "image":
        return "Image";
      case "document":
        return "Document";
      case "file":
        return "File";
      default:
        const _exhaustiveCheck: never = type;
        throw new Error(`Unknown attachment type: ${_exhaustiveCheck}`);
    }
  });

  return (
    <UserMessageAttachmentRoot>
      <AttachmentPrimitive.unstable_Thumb className="aui-attachment-thumb" />
      <div className="aui-attachment-text">
        <p className="aui-attachment-name">
          <AttachmentPrimitive.Name />
        </p>
        <p className="aui-attachment-type">{typeLabel}</p>
      </div>
    </UserMessageAttachmentRoot>
  );
};

UserMessageAttachment.displayName = "UserMessageAttachment";

const exports = {
  Root: UserMessageAttachmentRoot,
};

export default Object.assign(
  UserMessageAttachment,
  exports,
) as typeof UserMessageAttachment & typeof exports;
