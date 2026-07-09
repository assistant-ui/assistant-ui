import { createElement, Fragment } from "react";
import { PrismAsyncLight } from "react-syntax-highlighter";
import { makePrismAsyncLightSyntaxHighlighter } from "@assistant-ui/react-syntax-highlighter";

import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";

import {
  coldarkCold,
  coldarkDark,
} from "react-syntax-highlighter/dist/cjs/styles/prism";

PrismAsyncLight.registerLanguage("js", tsx);
PrismAsyncLight.registerLanguage("jsx", tsx);
PrismAsyncLight.registerLanguage("ts", tsx);
PrismAsyncLight.registerLanguage("tsx", tsx);
PrismAsyncLight.registerLanguage("python", python);

const syntaxHighlighterCustomStyle = {
  margin: 0,
  width: "100%",
  padding: "1.5rem 1rem",
};

const LightSyntaxHighlighter = makePrismAsyncLightSyntaxHighlighter({
  style: coldarkCold,
  customStyle: syntaxHighlighterCustomStyle,
  className: "dark:hidden",
});

const DarkSyntaxHighlighter = makePrismAsyncLightSyntaxHighlighter({
  style: coldarkDark,
  customStyle: syntaxHighlighterCustomStyle,
  className: "hidden dark:block",
});

type SyntaxHighlighterProps = Parameters<typeof LightSyntaxHighlighter>[0];

export const SyntaxHighlighter = (props: SyntaxHighlighterProps) =>
  createElement(
    Fragment,
    null,
    createElement(LightSyntaxHighlighter, props),
    createElement(DarkSyntaxHighlighter, props),
  );
