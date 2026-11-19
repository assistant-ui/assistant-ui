import { createComponent, For, type JSX } from "solid-js";
import { getAttachmentKeys } from "@assistant-ui/core/internal";
import { useAuiState } from "../useAuiState";
import { AttachmentByIndexProvider } from "./AttachmentByIndexProvider";

/**
 * Renders the current message's attachments in order, each scoped through
 * {@link AttachmentByIndexProvider}; the children render once per
 * attachment.
 */
export const MessagePrimitiveAttachments = (props: {
  children?: JSX.Element;
}): JSX.Element => {
  const keys = useAuiState((s) =>
    getAttachmentKeys(
      s.message.role === "user"
        ? (s.message.submission?.attachments ?? s.message.attachments)
        : [],
    ),
  );
  return createComponent(For<readonly string[], JSX.Element>, {
    get each() {
      return keys();
    },
    children: (_key, index) =>
      createComponent(AttachmentByIndexProvider, {
        source: "message",
        get index() {
          return index();
        },
        get children() {
          return props.children;
        },
      }),
  });
};
