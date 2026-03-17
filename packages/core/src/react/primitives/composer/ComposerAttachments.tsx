import type { Attachment } from "../../../types/attachment";
import { ComponentType, type FC, type ReactNode, memo, useMemo } from "react";
import { RenderChildrenWithAccessor, useAuiState } from "@assistant-ui/store";
import { ComposerAttachmentByIndexProvider } from "../../providers/AttachmentByIndexProvider";

type ComposerAttachmentsComponentConfig = {
  Image?: ComponentType | undefined;
  Document?: ComponentType | undefined;
  File?: ComponentType | undefined;
  Attachment?: ComponentType | undefined;
};

export namespace ComposerPrimitiveAttachments {
  export type Props =
    | {
        /** @deprecated Use the children render function instead. */
        components: ComposerAttachmentsComponentConfig;
        children?: never;
      }
    | {
        /** Render function called for each attachment. Receives the attachment. */
        children: (value: { attachment: Attachment }) => ReactNode;
        components?: never;
      };
}

const getComponent = (
  components: ComposerAttachmentsComponentConfig | undefined,
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
  components: ComposerAttachmentsComponentConfig | undefined;
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
    components?: ComposerAttachmentsComponentConfig;
  };
}

/**
 * Renders a single attachment at the specified index within the composer.
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

const ComposerPrimitiveAttachmentsInner: FC<{
  children: (value: { attachment: Attachment }) => ReactNode;
}> = ({ children }) => {
  const attachmentsCount = useAuiState((s) => s.composer.attachments.length);

  return useMemo(
    () =>
      Array.from({ length: attachmentsCount }, (_, index) => (
        <ComposerAttachmentByIndexProvider key={index} index={index}>
          <RenderChildrenWithAccessor
            getItemState={(aui) =>
              aui.composer().attachment({ index }).getState()
            }
          >
            {(getItem) =>
              children({
                get attachment() {
                  return getItem();
                },
              })
            }
          </RenderChildrenWithAccessor>
        </ComposerAttachmentByIndexProvider>
      )),
    [attachmentsCount, children],
  );
};

export const ComposerPrimitiveAttachments: FC<
  ComposerPrimitiveAttachments.Props
> = ({ components, children }) => {
  if (components) {
    return (
      <ComposerPrimitiveAttachmentsInner>
        {({ attachment }) => {
          const Component = getComponent(components, attachment);
          if (!Component) return null;
          return <Component />;
        }}
      </ComposerPrimitiveAttachmentsInner>
    );
  }
  return (
    <ComposerPrimitiveAttachmentsInner>
      {children}
    </ComposerPrimitiveAttachmentsInner>
  );
};

ComposerPrimitiveAttachments.displayName = "ComposerPrimitive.Attachments";
