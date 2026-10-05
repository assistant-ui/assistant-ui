import { defineComponent, h, type SlotsType, type VNodeChild } from "vue";
import { useAuiState } from "../useAuiState";
import { AttachmentByIndexProvider } from "./AttachmentByIndexProvider";
import { useStableKeys } from "./stableKeys";

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
    const attachmentIds = useStableKeys(
      () => attachments.value?.map((attachment) => attachment.id) ?? [],
    );
    return () =>
      attachmentIds.value.map((id, index) =>
        h(
          AttachmentByIndexProvider,
          { source: "message", index, key: id },
          { default: () => slots.default?.() },
        ),
      );
  },
});
