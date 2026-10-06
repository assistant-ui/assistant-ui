import { defineComponent, h, type SlotsType, type VNodeChild } from "vue";
import { useAuiState } from "../useAuiState";
import { AttachmentByIndexProvider } from "./AttachmentByIndexProvider";
import { getAttachmentKeys, useStableKeys } from "./stableKeys";

/**
 * Renders the current message's attachments in order, each scoped through
 * {@link AttachmentByIndexProvider}; the `default` slot renders each
 * attachment.
 */
export const MessagePrimitiveAttachments = defineComponent({
  name: "MessagePrimitiveAttachments",
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { slots }) {
    const attachments = useAuiState((s) =>
      s.message.role === "user"
        ? (s.message.submission?.attachments ?? s.message.attachments)
        : undefined,
    );
    const attachmentKeys = useStableKeys(() =>
      getAttachmentKeys(attachments.value ?? []),
    );
    return () =>
      attachmentKeys.value.map((key, index) =>
        h(
          AttachmentByIndexProvider,
          { source: "message", index, key },
          { default: () => slots.default?.() },
        ),
      );
  },
});
