"use client";

import { ComponentType, type FC, memo } from "react";
import { useComposerAttachment } from "../../context/react/AttachmentContext";
import { ComposerAttachmentProvider } from "../../context/providers/ComposerAttachmentProvider";
import type { ThreadComposerAttachment } from "../../context/stores/Attachment";
import { useThreadComposer } from "../../context/react/ThreadContext";

export type ComposerPrimitiveAttachmentsProps = {
  components:
    | {
        Image?: ComponentType | undefined;
        Document?: ComponentType | undefined;
        File?: ComponentType | undefined;
        Attachment?: ComponentType | undefined;
      }
    | undefined;
};

const getComponent = (
  components: ComposerPrimitiveAttachmentsProps["components"],
  attachment: ThreadComposerAttachment,
) => {
  const type = attachment.type;
  switch (type) {
    case "image":
      return components?.Image ?? components?.Attachment;
    case "document":
      return components?.Document ?? components?.Attachment;
    case "file":
      return components?.File ?? components?.Attachment;
    default:
      const _exhaustiveCheck: never = type;
      throw new Error(`Unknown attachment type: ${_exhaustiveCheck}`);
  }
};

const AttachmentComponent: FC<{
  components: ComposerPrimitiveAttachmentsProps["components"];
}> = ({ components }) => {
  const Component = useComposerAttachment((a) =>
    getComponent(components, a.attachment),
  );

  if (!Component) return null;
  return <Component />;
};

const ComposerAttachmentImpl: FC<
  ComposerPrimitiveAttachmentsProps & { attachmentIndex: number }
> = ({ components, attachmentIndex }) => {
  return (
    <ComposerAttachmentProvider attachmentIndex={attachmentIndex}>
      <AttachmentComponent components={components} />
    </ComposerAttachmentProvider>
  );
};

const ComposerAttachment = memo(
  ComposerAttachmentImpl,
  (prev, next) =>
    prev.attachmentIndex === next.attachmentIndex &&
    prev.components?.Image === next.components?.Image &&
    prev.components?.Document === next.components?.Document &&
    prev.components?.File === next.components?.File &&
    prev.components?.Attachment === next.components?.Attachment,
);

export const ComposerPrimitiveAttachments: FC<
  ComposerPrimitiveAttachmentsProps
> = ({ components }) => {
  const attachmentsCount = useThreadComposer((s) => s.attachments.length);

  return Array.from({ length: attachmentsCount }, (_, index) => (
    <ComposerAttachment
      key={index}
      attachmentIndex={index}
      components={components}
    />
  ));
};

ComposerPrimitiveAttachments.displayName = "ComposerPrimitive.Attachments";
