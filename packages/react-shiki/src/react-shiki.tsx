"use client";

import { ComponentType, type FC } from "react";
import ShikiHighlighter, { type ShikiHighlighterProps } from "react-shiki";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import { cn } from "../../../apps/registry/lib/utils";

type ExtendedSyntaxHighlighterProps = SyntaxHighlighterProps & {
  className?: string;
};

// TODO: Figure out why addDefaultStyles is still showing up in autocomplete for ShikiOptions. Maybe types didn't update after omitting it?
type ShikiConfig = Omit<
  ShikiHighlighterProps,
  "language" | "children" | "addDefaultStyles"
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
        >
          {code}
        </BaseHighlighter>
      );
    };

    ShikiSyntaxHighlighter.displayName = "ShikiSyntaxHighlighter";

    return ShikiSyntaxHighlighter;
  };

export const makeShikiHighlighter = makeMakeShikiHighlighter(ShikiHighlighter);
