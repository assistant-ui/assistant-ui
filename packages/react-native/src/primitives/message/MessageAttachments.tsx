import type { CompleteAttachment } from "@assistant-ui/core";
import { type FC, memo, useMemo } from "react";
import { useAuiState } from "@assistant-ui/store";
import { MessageAttachmentByIndexProvider } from "../../context/providers/AttachmentByIndexProvider";
import type { AttachmentComponents } from "../composer/ComposerAttachments";

export type MessageAttachmentsProps = {
  components: AttachmentComponents | undefined;
};

export type MessageAttachmentByIndexProps = {
  index: number;
  components?: AttachmentComponents | undefined;
};

const getComponent = (
  components: AttachmentComponents | undefined,
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
  components: AttachmentComponents | undefined;
}> = ({ components }) => {
  const attachment = useAuiState((s) => s.attachment);
  if (!attachment) return null;

  const Component = getComponent(components, attachment as CompleteAttachment);
  if (!Component) return null;
  return <Component />;
};

export const MessageAttachmentByIndex: FC<MessageAttachmentByIndexProps> = memo(
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

export const MessageAttachments = ({ components }: MessageAttachmentsProps) => {
  const attachmentsCount = useAuiState((s) => {
    if (s.message.role !== "user") return 0;
    return s.message.attachments.length;
  });

  return useMemo(() => {
    return Array.from({ length: attachmentsCount }, (_, index) => (
      <MessageAttachmentByIndex
        key={index}
        index={index}
        components={components}
      />
    ));
  }, [attachmentsCount, components]);
};
