"use client";

import { ComponentType, type FC } from "react";
import ShikiHighlighter, { type ShikiHighlighterProps } from "react-shiki";
import type { SyntaxHighlighterProps } from "../../react-markdown/src";

type ShikiConfig = Omit<ShikiHighlighterProps, "language" | "children">;

const makeMakeShikiHighlighter =
  (BaseHighlighter: ComponentType<ShikiHighlighterProps>) =>
  (config: ShikiConfig) => {
    const ShikiSyntaxHighlighter: FC<SyntaxHighlighterProps> = ({
      language,
      code,
    }) => {
      return (
        <BaseHighlighter {...config} language={language}>
          {code}
        </BaseHighlighter>
      );
    };

    ShikiSyntaxHighlighter.displayName = "ShikiSyntaxHighlighter";

    return ShikiSyntaxHighlighter;
  };

export const makeShikiHighlighter = makeMakeShikiHighlighter(ShikiHighlighter);
