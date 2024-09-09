"use client";

import { type FC } from "react";

import { withDefaults } from "./utils/withDefaults";
import { useAttachmentContext } from "../context/react/AttachmentContext";

const UserMessageAttachmentRoot = withDefaults("div", {
  className: "aui-user-message-attachment-root",
});

UserMessageAttachmentRoot.displayName = "UserMessageAttachmentRoot";

const UserMessageAttachment: FC = () => {
  const { useAttachment } = useAttachmentContext();
  const attachment = useAttachment((a) => a.attachment);

  return (
    <UserMessageAttachmentRoot>
      .{attachment.name.split(".").pop()}
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
