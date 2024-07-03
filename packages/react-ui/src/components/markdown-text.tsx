"use client";

import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import { FC, memo } from "react";
import { styled } from "../styled";
import { MarkdownTextPrimitiveProps } from "../../../react-markdown/src/MarkdownText";
import { TextContentPartProps } from "@assistant-ui/react";

const MarkdownTextH1 = styled("p", {
  className: "aui-md-h1",
});

const MarkdownTextH2 = styled("p", {
  className: "aui-md-h2",
});

const MarkdownTextH3 = styled("p", {
  className: "aui-md-h3",
});

const MarkdownTextH4 = styled("p", {
  className: "aui-md-h4",
});

const MarkdownTextH5 = styled("p", {
  className: "aui-md-h5",
});

const MarkdownTextH6 = styled("p", {
  className: "aui-md-h6",
});

const MarkdownTextP = styled("p", {
  className: "aui-md-p",
});

const MarkdownTextA = styled("a", {
  className: "aui-md-a",
});

const MarkdownTextBlockquote = styled("blockquote", {
  className: "aui-md-blockquote",
});

const MarkdownTextUl = styled("ul", {
  className: "aui-md-ul",
});

const MarkdownTextOl = styled("ol", {
  className: "aui-md-ol",
});

const MarkdownTextHr = styled("hr", {
  className: "aui-md-hr",
});

const MarkdownTextTable = styled("table", {
  className: "aui-md-table",
});

const MarkdownTextTh = styled("th", {
  className: "aui-md-th",
});

const MarkdownTextTd = styled("td", {
  className: "aui-md-td",
});

const MarkdownTextTr = styled("tr", {
  className: "aui-md-tr",
});

const MarkdownTextSup = styled("sup", {
  className: "aui-md-sup",
});

const MarkdownTextCode = styled("code", {
  className: "aui-md-code",
});

// TODO maybe remove TextContentPartProps alltogether
const MarkdownTextImpl: FC<
  Partial<MarkdownTextPrimitiveProps> & TextContentPartProps
> = ({ components, remarkPlugins, className, part, status, ...rest }) => {
  return (
    <MarkdownTextPrimitive
      className={
        (status === "in_progress" ? "aui-md-in-progress" : "aui-md-done") +
        (!!className ? " " + className : "")
      }
      remarkPlugins={[remarkGfm, ...(remarkPlugins ?? [])]}
      components={{
        h1: ({ node, ...props }) => <MarkdownTextH1 {...props} />,
        h2: ({ node, ...props }) => <MarkdownTextH2 {...props} />,
        h3: ({ node, ...props }) => <MarkdownTextH3 {...props} />,
        h4: ({ node, ...props }) => <MarkdownTextH4 {...props} />,
        h5: ({ node, ...props }) => <MarkdownTextH5 {...props} />,
        h6: ({ node, ...props }) => <MarkdownTextH6 {...props} />,
        p: ({ node, ...props }) => <MarkdownTextP {...props} />,
        a: ({ node, ...props }) => <MarkdownTextA {...props} />,
        blockquote: ({ node, ...props }) => (
          <MarkdownTextBlockquote {...props} />
        ),
        ul: ({ node, ...props }) => <MarkdownTextUl {...props} />,
        ol: ({ node, ...props }) => <MarkdownTextOl {...props} />,
        hr: ({ node, ...props }) => <MarkdownTextHr {...props} />,
        table: ({ node, ...props }) => <MarkdownTextTable {...props} />,
        th: ({ node, ...props }) => <MarkdownTextTh {...props} />,
        td: ({ node, ...props }) => <MarkdownTextTd {...props} />,
        tr: ({ node, ...props }) => <MarkdownTextTr {...props} />,
        sup: ({ node, ...props }) => <MarkdownTextSup {...props} />,
        code: ({ node, ...props }) => <MarkdownTextCode {...props} />,
        ...components,
      }}
      {...rest}
    />
  );
};

MarkdownTextImpl.displayName = "MarkdownText";

export const MarkdownText = memo(MarkdownTextImpl);
