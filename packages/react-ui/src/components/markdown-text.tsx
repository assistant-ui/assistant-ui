"use client";

import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import { FC, memo } from "react";
import { MarkdownTextPrimitiveProps } from "@assistant-ui/react-markdown";
import { TextContentPartProps } from "@assistant-ui/react";

// TODO probably make a builder function for this
const MarkdownTextImpl: FC<
  Partial<MarkdownTextPrimitiveProps> & TextContentPartProps
> = ({ remarkPlugins, className, part, status, ...rest }) => {
  return (
    <MarkdownTextPrimitive
      className={
        "aui-md-root" +
        (status === "in_progress" ? " aui-md aui-md-in-progress" : "") +
        (!!className ? " " + className : "")
      }
      remarkPlugins={[remarkGfm, ...(remarkPlugins ?? [])]}
      smooth // TODO figure out the default for this
      {...rest}
    />
  );
};

MarkdownTextImpl.displayName = "MarkdownText";

export const MarkdownText = memo(MarkdownTextImpl);
