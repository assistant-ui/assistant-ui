import type { CompleteAttachment } from "../../../types/attachment";
import {
  type ComponentType,
  type FC,
  type ReactNode,
  memo,
  useMemo,
} from "react";
import { RenderChildrenWithAccessor, useAuiState } from "@assistant-ui/store";
import { MessageAttachmentByIndexProvider } from "../../providers/AttachmentByIndexProvider";

type MessageAttachmentsComponentConfig = {
  Image?: ComponentType | undefined;
  Document?: ComponentType | undefined;
  File?: ComponentType | undefined;
  Attachment?: ComponentType | undefined;
};

export namespace MessagePrimitiveAttachments {
  export type Props =
    | {
        /** @deprecated Use the children render function instead. */
        components: MessageAttachmentsComponentConfig;
        children?: never;
      }
    | {
        /** Render function called for each attachment. Receives the attachment. */
        children: (value: { attachment: CompleteAttachment }) => ReactNode;
        components?: never;
      };
}

const getComponent = (
  components: MessageAttachmentsComponentConfig | undefined,
  attachment: CompleteAttachment,
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
  components: MessageAttachmentsComponentConfig | undefined;
}> = ({ components }) => {
  const attachment = useAuiState((s) => s.attachment);
  if (!attachment) return null;

  const Component = getComponent(components, attachment as CompleteAttachment);
  if (!Component) return null;
  return <Component />;
};

export namespace MessagePrimitiveAttachmentByIndex {
  export type Props = {
    index: number;
    components?: MessageAttachmentsComponentConfig;
  };
}

/**
 * Renders a single attachment at the specified index within the current message.
 */
export const MessagePrimitiveAttachmentByIndex: FC<MessagePrimitiveAttachmentByIndex.Props> =
  memo(
    ({ index, components }) => {
      return (
        <MessageAttachmentByIndexProvider index={index}>
          <AttachmentComponent components={components} />
        </MessageAttachmentByIndexProvider>
      );
    },
    (prev, next) =>
      prev.index === next.index &&
      prev.components?.Image === next.components?.Image &&
      prev.components?.Document === next.components?.Document &&
      prev.components?.File === next.components?.File &&
      prev.components?.Attachment === next.components?.Attachment,
  );

MessagePrimitiveAttachmentByIndex.displayName =
  "MessagePrimitive.AttachmentByIndex";

const MessagePrimitiveAttachmentsInner: FC<{
  children: (value: { attachment: CompleteAttachment }) => ReactNode;
}> = ({ children }) => {
  const attachmentsCount = useAuiState((s) => {
    if (s.message.role !== "user") return 0;
    return s.message.attachments.length;
  });

  return useMemo(
    () =>
      Array.from({ length: attachmentsCount }, (_, index) => (
        <MessageAttachmentByIndexProvider key={index} index={index}>
          <RenderChildrenWithAccessor
            getItemState={(aui) =>
              aui.message().attachment({ index }).getState()
            }
          >
            {(getItem) =>
              children({
                get attachment() {
                  return getItem() as CompleteAttachment;
                },
              })
            }
          </RenderChildrenWithAccessor>
        </MessageAttachmentByIndexProvider>
      )),
    [attachmentsCount, children],
  );
};

export const MessagePrimitiveAttachments: FC<
  MessagePrimitiveAttachments.Props
> = ({ components, children }) => {
  if (components) {
    return (
      <MessagePrimitiveAttachmentsInner>
        {({ attachment }) => {
          const Component = getComponent(components, attachment);
          if (!Component) return null;
          return <Component />;
        }}
      </MessagePrimitiveAttachmentsInner>
    );
  }
  return (
    <MessagePrimitiveAttachmentsInner>
      {children}
    </MessagePrimitiveAttachmentsInner>
  );
};

MessagePrimitiveAttachments.displayName = "MessagePrimitive.Attachments";
