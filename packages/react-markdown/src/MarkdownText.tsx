import { useContentPartContext } from "@assistant-ui/react";
import type { FC } from "react";
import ReactMarkdown, { type Options } from "react-markdown";

type MarkdownTextPrimitiveProps = Omit<Options, "children">;

export const MarkdownTextPrimitive: FC<MarkdownTextPrimitiveProps> = (
  options,
) => {
  const { useContentPart } = useContentPartContext();
  const text = useContentPart((c) => {
    if (c.part.type !== "text")
      throw new Error(
        "This component can only be used inside text content parts.",
      );

    return c.part.text;
  });
  return <ReactMarkdown {...options}>{text || "\u00A0"}</ReactMarkdown>;
};
