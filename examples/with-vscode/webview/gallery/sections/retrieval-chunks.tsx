import {
  RetrievalChunks,
  type RetrievalChunk,
} from "@assistant-ui/ui/components/assistant-ui/elements/retrieval-chunks.tsx";
import { defineSections } from "../types";

const CHUNKS: readonly RetrievalChunk[] = [
  {
    id: "c1",
    source: "vscode-guide.mdx",
    locator: "§ 2",
    score: 0.91,
    text: "The webview cannot reach your backend directly, so vscodeFetch tunnels each request over postMessage to the extension host.",
  },
  {
    id: "c2",
    source: "packages/vscode/src/host/html.ts",
    locator: "L112–145",
    score: 0.84,
    text: "createWebviewCsp returns a policy whose scripts carry the nonce and whose other resources load through asWebviewUri.",
  },
  {
    id: "c3",
    source: "CHANGELOG.md",
    locator: "0.14.0",
    score: 0.62,
    text: "feat(vscode): theme preset mapping shadcn tokens to --vscode-* variables.",
  },
];

export default defineSections([
  {
    id: "retrieval-chunks",
    title: "Retrieval chunks",
    category: "content",
    notes: "Three retrieved chunks with scores and locators.",
    render: () => (
      <RetrievalChunks
        query="how does the webview reach the backend"
        chunks={CHUNKS}
        visibleCount={CHUNKS.length}
        searching={false}
      />
    ),
  },
  {
    id: "retrieval-chunks-searching",
    title: "Retrieval chunks (searching)",
    category: "content",
    notes: "The searching state before any chunk arrives.",
    render: () => (
      <RetrievalChunks
        query="how does the webview reach the backend"
        chunks={CHUNKS}
        visibleCount={0}
        searching
      />
    ),
  },
]);
