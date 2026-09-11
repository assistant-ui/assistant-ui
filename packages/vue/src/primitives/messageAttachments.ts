import { defineComponent, h, type SlotsType, type VNodeChild } from "vue";
import { useAuiState } from "../useAuiState";
import { AttachmentByIndexProvider } from "./AttachmentByIndexProvider";

/**
 * Renders the current message's attachments in order, each scoped through
 * {@link AttachmentByIndexProvider}; the `default` slot renders each
 * attachment.
 */
export const MessagePrimitiveAttachments = defineComponent({
  name: "MessagePrimitiveAttachments",
  slots: Object as SlotsType<{ default?: () => VNodeChild[] }>,
  setup(_, { slots }) {
    const count = useAuiState((s) =>
      s.message.role === "user" ? (s.message.attachments?.length ?? 0) : 0,
    );
    return () =>
      Array.from({ length: count.value }, (_, index) =>
        h(
          AttachmentByIndexProvider,
          { source: "message", index, key: index },
          { default: () => slots.default?.() },
        ),
      );
  },
});
