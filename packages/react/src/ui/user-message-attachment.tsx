"use client";

import { type FC } from "react";

import { withDefaults } from "./utils/withDefaults";
import { AttachmentPrimitive } from "../primitives";

const UserMessageAttachmentRoot = withDefaults(AttachmentPrimitive.Root, {
  className: "aui-user-message-attachment-root",
});

UserMessageAttachmentRoot.displayName = "UserMessageAttachmentRoot";

const UserMessageAttachment: FC = () => {
  return (
    <UserMessageAttachmentRoot>
      <AttachmentPrimitive.unstable_Thumb />
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
