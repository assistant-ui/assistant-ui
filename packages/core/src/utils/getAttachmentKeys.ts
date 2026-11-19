export const getAttachmentKeys = (
  attachments: readonly { readonly id: string }[],
): string[] => {
  const ids = attachments.map((attachment) => attachment.id);
  return ids.map((id, index) =>
    ids.indexOf(id) === ids.lastIndexOf(id)
      ? `attachment:${id}`
      : `attachment@${index}`,
  );
};
