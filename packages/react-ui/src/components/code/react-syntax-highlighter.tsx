"use client";

import { type FC } from "react";
import { Prism, SyntaxHighlighterProps as SHP } from "react-syntax-highlighter";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";

export const makePrismSyntaxHighlighter = (
  config: Omit<SHP, "language" | "children">,
) => {
  const PrismSyntaxHighlighter: FC<SyntaxHighlighterProps> = ({
    components: { Pre, Code },
    language,
    code,
  }) => {
    return (
      <Prism PreTag={Pre} CodeTag={Code} {...config} language={language}>
        {code}
      </Prism>
    );
  };

  PrismSyntaxHighlighter.displayName = "PrismSyntaxHighlighter";

  return PrismSyntaxHighlighter;
};
