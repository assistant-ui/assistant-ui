import { makePrismAsyncSyntaxHighlighter } from "@assistant-ui/react-syntax-highlighter/full";
import { coldarkDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export const SyntaxHighlighter = makePrismAsyncSyntaxHighlighter({
  style: coldarkDark,
  customStyle: {
    margin: 0,
    backgroundColor: "black",
  },
});
