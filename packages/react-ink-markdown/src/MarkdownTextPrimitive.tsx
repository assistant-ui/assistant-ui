import "@assistant-ui/core/store"; // scope-registration side-effect (part scope)
import type {
  MessagePartState,
  TextMessagePart,
  ReasoningMessagePart,
} from "@assistant-ui/core";
import { useAuiState } from "@assistant-ui/store";
import { MarkdownText, type MarkdownTextProps } from "./MarkdownText";

type MarkdownTextPrimitiveProps = Omit<MarkdownTextProps, "text" | "status">;

/**
 * Auto-wired markdown text primitive that reads text and status from the
 * runtime context. Use this inside `MessagePrimitive.Parts` as the `Text`
 * component.
 *
 * @example
 * ```tsx
 * <MessagePrimitive.Parts
 *   components={{ Text: MarkdownTextPrimitive }}
 * />
 * ```
 *
 * For use with `MessageContent`'s `renderText` callback (which does not
 * have a part scope), use `MarkdownText` directly and pass `text`/`status`
 * as props.
 */
const MarkdownTextPrimitive = (props: MarkdownTextPrimitiveProps) => {
  const part = useAuiState((s) => {
    if (s.part.type !== "text" && s.part.type !== "reasoning")
      throw new Error(
        "MarkdownTextPrimitive can only be used inside text or reasoning message parts.",
      );

    return s.part as MessagePartState &
      (TextMessagePart | ReasoningMessagePart);
  });

  return (
    <MarkdownText
      text={part.text}
      status={part.status.type === "running" ? "running" : "complete"}
      {...props}
    />
  );
};

MarkdownTextPrimitive.displayName = "MarkdownTextPrimitive";

export { MarkdownTextPrimitive };
export type { MarkdownTextPrimitiveProps };
