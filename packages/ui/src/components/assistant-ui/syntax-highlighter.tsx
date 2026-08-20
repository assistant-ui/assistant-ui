import { PrismAsyncLight } from "react-syntax-highlighter";
import { makePrismAsyncLightSyntaxHighlighter } from "@assistant-ui/react-syntax-highlighter";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";

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

// Both pres sit under the code header; the reset cannot come from the
// adjacent-sibling rule in markdown-text, which only reaches the first pre.
const LightSyntaxHighlighter = makePrismAsyncLightSyntaxHighlighter({
  style: coldarkCold,
  customStyle: syntaxHighlighterCustomStyle,
  className: "dark:hidden mt-0 rounded-t-none",
});

const DarkSyntaxHighlighter = makePrismAsyncLightSyntaxHighlighter({
  style: coldarkDark,
  customStyle: syntaxHighlighterCustomStyle,
  className: "hidden dark:block mt-0 rounded-t-none",
});

export const SyntaxHighlighter = (props: SyntaxHighlighterProps) => (
  <>
    <LightSyntaxHighlighter {...props} />
    <DarkSyntaxHighlighter {...props} />
  </>
);
