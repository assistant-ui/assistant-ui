"use client";

import { ComponentType, type FC } from "react";
import SyntaxHighlighter, {
  Prism,
  PrismAsync,
  PrismAsyncLight,
  PrismLight,
  Light,
  LightAsync,
  SyntaxHighlighterProps as SHP,
} from "react-syntax-highlighter";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";

const makeMakeSyntaxHighlighter =
  (SyntaxHighlighter: ComponentType<SHP>) =>
  (config: Omit<SHP, "language" | "children">) => {
    const PrismSyntaxHighlighter: FC<SyntaxHighlighterProps> = ({
      components: { Pre, Code },
      language,
      code,
    }) => {
      return (
        <SyntaxHighlighter
          PreTag={Pre}
          CodeTag={Code}
          {...config}
          language={language}
        >
          {code}
        </SyntaxHighlighter>
      );
    };

    PrismSyntaxHighlighter.displayName = "PrismSyntaxHighlighter";

    return PrismSyntaxHighlighter;
  };

export const makeSyntaxHighlighter =
  makeMakeSyntaxHighlighter(SyntaxHighlighter);

export const makePrismSyntaxHighlighter = makeMakeSyntaxHighlighter(Prism);

export const makePrismAsyncSyntaxHighlighter =
  makeMakeSyntaxHighlighter(PrismAsync);

export const makePrismAsyncLightSyntaxHighlighter =
  makeMakeSyntaxHighlighter(PrismAsyncLight);

export const makePrismLightSyntaxHighlighter =
  makeMakeSyntaxHighlighter(PrismLight);

export const makeLightSyntaxHighlighter = makeMakeSyntaxHighlighter(Light);

export const makeLightAsyncSyntaxHighlighter =
  makeMakeSyntaxHighlighter(LightAsync);
