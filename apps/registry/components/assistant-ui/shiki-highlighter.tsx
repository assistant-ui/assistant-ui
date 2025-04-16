"use client";

import { FC } from "react";
import ShikiHighlighter, { type ShikiHighlighterProps as BaseShikiProps } from "react-shiki";
// import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";

type ShikiSyntaxHighlighterProps = Omit<
  BaseShikiProps,
  "addDefaultStyles" | "showLanguage" | "children" | "theme"
> & { code: string };

// Higher order component solves initialization issue
export const SyntaxHighlighter: FC<ShikiSyntaxHighlighterProps> = (props) => {
  return <SH {...props} />;
};

const SH: FC<ShikiSyntaxHighlighterProps> = ({
  language,
  code,
}) => {
  return (
    <ShikiHighlighter
      language={language}
      theme="andromeeda"
      className="[&_pre]:px-4 [&_pre]:py-2 [&_pre]:overflow-x-auto [&_pre]:rounded-b-lg [&_pre]:bg-black [&_pre]:p-4 [&_pre]:text-white"
      addDefaultStyles={false}
      showLanguage={false}
    >
      {code}
    </ShikiHighlighter>
  );
};