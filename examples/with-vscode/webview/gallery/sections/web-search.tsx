import {
  WebSearch,
  type WebSearchResult,
} from "@assistant-ui/ui/components/assistant-ui/elements/web-search.tsx";
import { defineSections } from "../types";

const RESULTS: readonly WebSearchResult[] = [
  { title: "Webview API", domain: "code.visualstudio.com" },
  {
    title:
      "Content Security Policy (CSP) and nonces for inline scripts and styles",
    domain: "developer.mozilla.org",
  },
  { title: "assistant-ui in a VS Code extension", domain: "assistant-ui.com" },
];

export default defineSections([
  {
    id: "web-search",
    title: "Web search",
    category: "content",
    notes: "Searching with one result in, then done with all three.",
    render: () => (
      <div className="flex flex-col gap-3">
        <WebSearch
          query="vscode webview csp nonce"
          results={RESULTS}
          visibleResults={1}
          searching
          cycle={0}
        />
        <WebSearch
          query="vscode webview csp nonce"
          results={RESULTS}
          visibleResults={3}
          searching={false}
          cycle={0}
        />
      </div>
    ),
  },
]);
