import { defineFixtures } from "../types";

/** Rendered by the data UIs in `webview/fixture-ui/content-elements.tsx`. */
export const TABLE_DATA = "content-table";
export const CHART_DATA = "content-chart";
export const DIFF_DATA = "content-diff";

/** Rendered by the tool UIs in `webview/fixture-ui/content-elements.tsx`. */
export const WEB_SEARCH_TOOL = "content_web_search";
export const RETRIEVE_TOOL = "content_retrieve";
export const RUN_TESTS_TOOL = "content_run_tests";

export type TableData = {
  caption: string;
  rows: { name: string; context: number; input: number; latency: number }[];
};
export type ChartData = {
  label: string;
  value: string;
  delta: string;
  points: number[];
};
export type DiffData = {
  filename: string;
  lines: { kind: "context" | "added" | "removed"; text: string }[];
};
export type WebSearchArgs = { query: string };
export type WebSearchResult = { results: { title: string; domain: string }[] };
export type RetrieveArgs = { query: string };
export type RetrieveResult = {
  chunks: {
    id: string;
    source: string;
    locator: string;
    score: number;
    text: string;
  }[];
};
export type RunTestsArgs = { command: string };
export type RunTestsResult = {
  lines: string[];
  exitCode: number;
  durationMs: number;
};

const CODE_MARKDOWN = `The bridge call, the config it reads, and the path the request takes:

\`\`\`ts
import { vscodeFetch } from "@assistant-ui/vscode/webview";

export async function ask(prompt: string): Promise<string> {
  const res = await vscodeFetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
  return res.text();
}
\`\`\`

\`\`\`json
{ "auiTest.csp": "strict", "auiTest.runtime": "local" }
\`\`\`

\`\`\`mermaid
graph TD
  W[Webview] -->|postMessage| H[Extension host]
  H -->|stream| W
\`\`\`

The Thread's MarkdownText decides how each block renders.`;

const svg = (body: string) =>
  `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270">${body}</svg>`,
  )}`;

const GENERATED_IMAGE = svg(
  `<rect width="480" height="270" fill="#60a5fa"/><circle cx="360" cy="80" r="40" fill="#fef08a"/><path d="M0 200 Q120 130 240 190 T480 170 V270 H0 Z" fill="#166534"/>`,
);

/** A 0.25 s 440 Hz tone as an 8 kHz, 8-bit mono WAV. */
const TONE_WAV = (() => {
  const rate = 8000;
  const samples = rate / 4;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++)
      view.setUint8(offset + i, text.charCodeAt(i));
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  ascii(36, "data");
  view.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) {
    bytes[44 + i] =
      128 + Math.round(60 * Math.sin((2 * Math.PI * 440 * i) / rate));
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:audio/wav;base64,${btoa(binary)}`;
})();

const table: TableData = {
  caption: "Model comparison",
  rows: [
    { name: "Opus 5.5", context: 1_000_000, input: 4, latency: 910 },
    { name: "Sonnet 4.5", context: 200_000, input: 3, latency: 820 },
    { name: "Haiku 4.5", context: 200_000, input: 0.8, latency: 420 },
  ],
};

const chart: ChartData = {
  label: "Runs this week",
  value: "92",
  delta: "+34%",
  points: [18, 22, 19, 31, 28, 42, 38, 51, 47, 63, 58, 71, 69, 84, 92],
};

const diff: DiffData = {
  filename: "bridge.ts",
  lines: [
    { kind: "context", text: "export function vscodeFetch(input, init) {" },
    { kind: "removed", text: "  const signal = undefined;" },
    { kind: "added", text: "  const signal = init?.signal ?? null;" },
    { kind: "context", text: "  return send({ input, init, signal });" },
  ],
};

export default defineFixtures([
  {
    name: "codeblocks",
    description: "Fenced ts, json and mermaid blocks in one markdown reply",
    prompt: "codeblocks Show code and a diagram",
    script: () => [{ type: "text", text: CODE_MARKDOWN }],
  },
  {
    name: "datatable",
    description: "Data table and chart data parts around a text answer",
    prompt: "datatable Compare the models",
    script: () => [
      { type: "text", text: "Here are the models side by side." },
      {
        type: "data",
        name: TABLE_DATA,
        data: table,
      },
      {
        type: "data",
        name: CHART_DATA,
        data: chart,
      },
      {
        type: "text",
        text: "Haiku is the fastest; Opus has the longest context.",
      },
    ],
  },
  {
    name: "research",
    description: "Web search and retrieval tool UIs, then a cited answer",
    prompt: "research How does the webview reach the backend?",
    script: () => [
      {
        type: "tool-call",
        toolCallId: "web-search-1",
        toolName: WEB_SEARCH_TOOL,
        args: { query: "vscode webview fetch backend" } satisfies WebSearchArgs,
        result: {
          results: [
            { title: "Webview API", domain: "code.visualstudio.com" },
            {
              title: "Content Security Policy",
              domain: "developer.mozilla.org",
            },
            { title: "assistant-ui in VS Code", domain: "assistant-ui.com" },
          ],
        } satisfies WebSearchResult,
      },
      {
        type: "tool-call",
        toolCallId: "retrieve-1",
        toolName: RETRIEVE_TOOL,
        args: { query: "fetch bridge" } satisfies RetrieveArgs,
        result: {
          chunks: [
            {
              id: "c1",
              source: "vscode-guide.mdx",
              locator: "§ 2",
              score: 0.91,
              text: "vscodeFetch tunnels each request over postMessage to the extension host.",
            },
            {
              id: "c2",
              source: "html.ts",
              locator: "L112–145",
              score: 0.74,
              text: "createWebviewCsp gives scripts the nonce and loads other resources through asWebviewUri.",
            },
          ],
        } satisfies RetrieveResult,
      },
      {
        type: "text",
        text: "The webview tunnels **fetch** over `postMessage`, and the host streams the response back.",
      },
      {
        type: "source",
        id: "src-webview",
        url: "https://code.visualstudio.com/api/extension-guides/webview",
        title: "Webview API",
      },
    ],
  },
  {
    name: "testrun",
    description: "Terminal tool UI for a test run and a code diff data part",
    prompt: "testrun Fix the bridge and run the tests",
    script: () => [
      { type: "text", text: "Patched the abort handling:" },
      {
        type: "data",
        name: DIFF_DATA,
        data: diff,
      },
      {
        type: "tool-call",
        toolCallId: "tests-1",
        toolName: RUN_TESTS_TOOL,
        args: { command: "pnpm vitest run bridge" } satisfies RunTestsArgs,
        result: {
          lines: [
            "RUN v4.0.5 /examples/with-vscode",
            "✓ bridge streams a response body (12ms)",
            "✓ bridge aborts with the webview (9ms)",
            "Tests 2 passed (2)",
          ],
          exitCode: 0,
          durationMs: 840,
        } satisfies RunTestsResult,
      },
      { type: "text", text: "Both bridge tests pass." },
    ],
  },
  {
    name: "media",
    description: "Generated image and audio file parts",
    prompt: "media Generate a picture and a tone",
    script: () => [
      { type: "text", text: "Here is the picture and a short tone." },
      { type: "file", mediaType: "image/svg+xml", data: GENERATED_IMAGE },
      { type: "file", mediaType: "audio/wav", data: TONE_WAV },
    ],
  },
]);
