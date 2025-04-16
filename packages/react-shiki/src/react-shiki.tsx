"use client";

import { ComponentType, type FC } from "react";
import ShikiHighlighter, { type ShikiHighlighterProps } from "react-shiki";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import { cn } from "../../../apps/registry/lib/utils";

type ExtendedSyntaxHighlighterProps = SyntaxHighlighterProps & {
  className?: string;
};

type ShikiConfig = Omit<
  ShikiHighlighterProps,
  "language" | "children" | "addDefaultStyles" | "showLanguage"
>;

const makeMakeShikiHighlighter =
  (BaseHighlighter: ComponentType<ShikiHighlighterProps>) =>
  (config: ShikiConfig) => {
    const ShikiSyntaxHighlighter: FC<ExtendedSyntaxHighlighterProps> = ({
      language,
      code,
      className,
    }) => {
      return (
        <BaseHighlighter
          {...config}
          language={language}
          className={cn(
            "[&_pre]:overflow-x-auto [&_pre]:px-4 [&_pre]:py-2",
            config.className,
            className,
          )}
          addDefaultStyles={false}
          showLanguage={false}
        >
          {code}
        </BaseHighlighter>
      );
    };

    ShikiSyntaxHighlighter.displayName = "ShikiSyntaxHighlighter";

    return ShikiSyntaxHighlighter;
  };

export const makeShikiHighlighter = makeMakeShikiHighlighter(ShikiHighlighter);
