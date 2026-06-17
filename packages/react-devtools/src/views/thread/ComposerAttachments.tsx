import type { AttachmentPreview } from "../attachments/types";
import { AttachmentList } from "../attachments";

export const ComposerAttachments = ({
  attachments,
}: {
  attachments: readonly AttachmentPreview[];
}) => <AttachmentList attachments={attachments} label="Composer attachments" />;
