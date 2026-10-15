import { computed } from "vue";

export const useStableKeys = (getKeys: () => string[]) =>
  computed<string[]>((previous) => {
    const keys = getKeys();
    return previous?.length === keys.length &&
      previous.every((key, index) => key === keys[index])
      ? previous
      : keys;
  });

export const getAttachmentKeys = (
  attachments: readonly { readonly id: string }[],
) => {
  const ids = attachments.map((attachment) => attachment.id);
  return ids.map((id, index) =>
    ids.indexOf(id) === ids.lastIndexOf(id)
      ? `attachment:${id}`
      : `attachment@${index}`,
  );
};
