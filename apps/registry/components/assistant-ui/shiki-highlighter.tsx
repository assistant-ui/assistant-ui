"use client";

import { FC } from "react";
import ShikiHighlighter, { type ShikiHighlighterProps } from "react-shiki";
import type { SyntaxHighlighterProps as AUIProps } from "@assistant-ui/react-markdown";

export type ShikiSyntaxHighlighterProps = Omit<
  ShikiHighlighterProps,
  "children"
> &
  Pick<AUIProps, "node" | "components" | "language" | "code">;

export const SyntaxHighlighter: FC<ShikiSyntaxHighlighterProps> = ({
  code,
  language,
  node,
  components: _ignored,
  theme = "vitesse-dark",
  addDefaultStyles = false,
  showLanguage = false,
  ...shikiProps
}) => {
  return (
    <ShikiHighlighter
      {...shikiProps}
      language={language}
      theme={theme}
      addDefaultStyles={addDefaultStyles}
      showLanguage={showLanguage}
      className="[&_pre]:overflow-x-auto [&_pre]:rounded-b-lg [&_pre]:bg-black [&_pre]:p-4 [&_pre]:text-white"
    >
      {code}
    </ShikiHighlighter>
  );
};

SyntaxHighlighter.displayName = "SyntaxHighlighter";
