import { ContentPartPrimitive } from "@assistant-ui/react";
import { useContentPartContext } from "@assistant-ui/react/experimental";
import type { FC } from "react";
import ReactMarkdown, { type Options } from "react-markdown";

export const MarkdownText: FC<Options> = (options) => {
  const { useContentPart } = useContentPartContext();
  const text = useContentPart((c) => {
    if (c.part.type !== "text")
      throw new Error(
        "This component can only be used inside text content parts.",
      );

    return c.part.text;
  });
  return (
    <span>
      <ReactMarkdown {...options}>{text}</ReactMarkdown>
      <ContentPartPrimitive.InProgressIndicator />
    </span>
  );
};
