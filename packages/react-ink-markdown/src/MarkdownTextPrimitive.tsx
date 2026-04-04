import "@assistant-ui/core/store"; // scope-registration side-effect (part scope)
import type {
  MessagePartState,
  TextMessagePart,
  ReasoningMessagePart,
} from "@assistant-ui/core";
import { useMemo } from "react";
import { useAuiState } from "@assistant-ui/store";
import { MarkdownText, type MarkdownTextProps } from "./MarkdownText";

type MarkdownTextPrimitiveProps = Omit<MarkdownTextProps, "text"> & {
  /** Transform the text before rendering. */
  preprocess?: ((text: string) => string) | undefined;
};

/**
 * Auto-wired markdown text primitive that reads text and status from the
 * runtime context. Use this inside `MessagePrimitive.Parts` as the `Text`
 * component.
 *
 * @example
 * ```tsx
 * <MessagePrimitive.Parts>
 *   {({ part }) => {
 *     if (part.type === "text") return <MarkdownTextPrimitive />;
 *     return null;
 *   }}
 * </MessagePrimitive.Parts>
 * ```
 *
 * For use with `MessageContent`'s `renderText` callback (which does not
 * have a part scope), use `MarkdownText` directly and pass `text`/`status`
 * as props.
 */
const MarkdownTextPrimitive = ({
  preprocess,
  ...props
}: MarkdownTextPrimitiveProps) => {
  const part = useAuiState((s) => {
    if (s.part.type !== "text" && s.part.type !== "reasoning")
      throw new Error(
        "MarkdownTextPrimitive can only be used inside text or reasoning message parts.",
      );

    return s.part as MessagePartState &
      (TextMessagePart | ReasoningMessagePart);
  });

  const text = useMemo(
    () => (preprocess ? preprocess(part.text) : part.text),
    [part.text, preprocess],
  );

  return <MarkdownText text={text} {...props} />;
};

MarkdownTextPrimitive.displayName = "MarkdownTextPrimitive";

export { MarkdownTextPrimitive };
export type { MarkdownTextPrimitiveProps };
