import { ContentPartPrimitive } from "@assistant-ui/react";
import { useContentPartContext } from "@assistant-ui/react";
import type { FC } from "react";
import ReactMarkdown, { type Options } from "react-markdown";

export const MarkdownTextPrimitive: FC<Omit<Options, "children">> = (
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
  return (
    <>
      <ReactMarkdown {...options}>{text}</ReactMarkdown>
      <ContentPartPrimitive.InProgressIndicator />
    </>
  );
};
