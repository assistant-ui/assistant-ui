"use client";

import type { Attachment } from "@assistant-ui/core";
import { ComponentType, type FC, memo, useMemo } from "react";
import { useAuiState } from "@assistant-ui/store";
import { ComposerAttachmentByIndexProvider } from "../../context/providers";

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
      return components?.Attachment;
  }
};

const AttachmentComponent: FC<{
  components: ComposerPrimitiveAttachments.Props["components"];
}> = ({ components }) => {
  const attachment = useAuiState((s) => s.attachment);
  if (!attachment) return null;

  const Component = getComponent(components, attachment);
  if (!Component) return null;
  return <Component />;
};

export namespace ComposerPrimitiveAttachmentByIndex {
  export type Props = {
    index: number;
    components?: ComposerPrimitiveAttachments.Props["components"];
  };
}

/**
 * Renders a single attachment at the specified index within the composer.
 *
 * This component provides direct access to render a specific attachment
 * from the composer's attachment list using the provided component configuration.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.AttachmentByIndex
 *   index={0}
 *   components={{
 *     Image: MyImageAttachment,
 *     Document: MyDocumentAttachment
 *   }}
 * />
 * ```
 */
export const ComposerPrimitiveAttachmentByIndex: FC<ComposerPrimitiveAttachmentByIndex.Props> =
  memo(
    ({ index, components }) => {
      return (
        <ComposerAttachmentByIndexProvider index={index}>
          <AttachmentComponent components={components} />
        </ComposerAttachmentByIndexProvider>
      );
    },
    (prev, next) =>
      prev.index === next.index &&
      prev.components?.Image === next.components?.Image &&
      prev.components?.Document === next.components?.Document &&
      prev.components?.File === next.components?.File &&
      prev.components?.Attachment === next.components?.Attachment,
  );

ComposerPrimitiveAttachmentByIndex.displayName =
  "ComposerPrimitive.AttachmentByIndex";

export const ComposerPrimitiveAttachments: FC<
  ComposerPrimitiveAttachments.Props
> = ({ components }) => {
  const attachmentsCount = useAuiState((s) => s.composer.attachments.length);

  const attachmentElements = useMemo(() => {
    return Array.from({ length: attachmentsCount }, (_, index) => (
      <ComposerPrimitiveAttachmentByIndex
        key={index}
        index={index}
        components={components}
      />
    ));
  }, [attachmentsCount, components]);

  return attachmentElements;
};

ComposerPrimitiveAttachments.displayName = "ComposerPrimitive.Attachments";
