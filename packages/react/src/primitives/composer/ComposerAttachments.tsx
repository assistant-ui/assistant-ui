"use client";

import { ComponentType, type FC, memo, useMemo } from "react";
import { Attachment } from "../../types";
import { useComposer, useComposerRuntime } from "../../context";
import { useThreadComposerAttachment } from "../../context/react/AttachmentContext";
import { AttachmentRuntimeProvider } from "../../context/providers/AttachmentRuntimeProvider";

/**
 * @deprecated Use `ComposerPrimitive.Attachments.Props` instead. This will be removed in 0.6.
 */
export type ComposerPrimitiveAttachmentsProps =
  ComposerPrimitiveAttachments.Props;

export namespace ComposerPrimitiveAttachments {
  export type Props = {
    components:
      | {
          Image?: ComponentType | undefined;
          Document?: ComponentType | undefined;
          File?: ComponentType | undefined;
          Attachment?: ComponentType | undefined;
        }
      | undefined;
  };
}

const getComponent = (
  components: ComposerPrimitiveAttachments.Props["components"],
  attachment: Attachment,
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
  components: ComposerPrimitiveAttachments.Props["components"];
}> = ({ components }) => {
  const Component = useThreadComposerAttachment((a) =>
    getComponent(components, a),
  );

  if (!Component) return null;
  return <Component />;
};

const ComposerAttachmentImpl: FC<
  ComposerPrimitiveAttachments.Props & { attachmentIndex: number }
> = ({ components, attachmentIndex }) => {
  const composerRuntime = useComposerRuntime();
  const runtime = useMemo(
    () => composerRuntime.getAttachmentByIndex(attachmentIndex),
    [composerRuntime, attachmentIndex],
  );

  return (
    <AttachmentRuntimeProvider runtime={runtime}>
      <AttachmentComponent components={components} />
    </AttachmentRuntimeProvider>
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
  ComposerPrimitiveAttachments.Props
> = ({ components }) => {
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
