import { INTERNAL, useContentPartText } from "@assistant-ui/react";
import type { FC } from "react";
import ReactMarkdown, { type Options } from "react-markdown";

const { useSmooth } = INTERNAL;

export type MarkdownTextPrimitiveProps = Omit<Options, "children"> & {
  smooth?: boolean;
};

export const MarkdownTextPrimitive: FC<MarkdownTextPrimitiveProps> = (
  options,
) => {
  const {
    part: { text },
  } = useContentPartText();
  const smoothText = useSmooth(text, options.smooth);
  return <ReactMarkdown {...options}>{smoothText}</ReactMarkdown>;
};
