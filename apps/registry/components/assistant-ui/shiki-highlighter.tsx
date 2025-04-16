"use client";

import { lazy, Suspense, FC } from "react";
// import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import type { ShikiHighlighterProps as BaseShikiProps } from "react-shiki";

// create lazy loaded component that solves issue with component initialization
// previously it was initializing before react-shiki was loaded, causing errors
// the factory pattern created a component function that was evaluated later, ensuring react-shiki was loaded
const ShikiModule = lazy<React.ComponentType<BaseShikiProps>>(
  () => import("react-shiki"),
);

type ShikiSyntaxHighlighterProps = Omit<
  BaseShikiProps,
  "addDefaultStyles" | "showLanguage" | "children" | "theme"
> & { code: string };

export const SyntaxHighlighter: FC<ShikiSyntaxHighlighterProps> = ({
  language,
  code,
}) => {
  return (
    <Suspense
      fallback={
        <pre>
          <code>{code}</code>
        </pre>
      }
    >
      <ShikiModule
        language={language}
        theme={"andromeeda"}
        className="[&_pre]:overflow-x-auto [&_pre]:px-4 [&_pre]:py-2"
        addDefaultStyles={false}
        showLanguage={false}
      >
        {code}
      </ShikiModule>
    </Suspense>
  );
};
