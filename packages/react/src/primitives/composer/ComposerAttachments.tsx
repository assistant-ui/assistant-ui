"use client";

import { ComponentType, type FC, memo } from "react";
import { useThreadContext } from "../../context";
import { useAttachmentContext } from "../../context/react/AttachmentContext";
import { ComposerAttachmentProvider } from "../../context/providers/ComposerAttachmentProvider";
import { Attachment } from "../../context/stores/Attachment";

export type ComposerPrimitiveAttachmentsProps = {
  components:
    | {
        Image?: ComponentType | undefined;
        Document?: ComponentType | undefined;
        File?: ComponentType | undefined;
        Fallback?: ComponentType | undefined;
      }
    | undefined;
};

const getComponent = (
  components: ComposerPrimitiveAttachmentsProps["components"],
  attachment: Attachment,
) => {
  const type = attachment.type;
  switch (type) {
    case "image":
      return components?.Image ?? components?.Fallback;
    case "document":
      return components?.Document ?? components?.Fallback;
    case "file":
      return components?.File ?? components?.Fallback;
    default:
      const _exhaustiveCheck: never = type;
      throw new Error(`Unknown attachment type: ${_exhaustiveCheck}`);
  }
};

const AttachmentComponent: FC<{
  components: ComposerPrimitiveAttachmentsProps["components"];
}> = ({ components }) => {
  const { useAttachment } = useAttachmentContext();
  const Component = useAttachment((a) =>
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
    prev.components?.Fallback === next.components?.Fallback,
);

export const ComposerPrimitiveAttachments: FC<
  ComposerPrimitiveAttachmentsProps
> = ({ components }) => {
  const { useComposer } = useThreadContext();
  const attachmentsCount = useComposer((s) => s.attachments.length);

  return Array.from({ length: attachmentsCount }, (_, index) => (
    <ComposerAttachment
      key={index}
      attachmentIndex={index}
      components={components}
    />
  ));
};

ComposerPrimitiveAttachments.displayName = "ComposerPrimitive.Attachments";
