import path from "node:path";
import {
  findHighlighterTraceGaps,
  findRoutesWithoutHighlighter,
  formatHighlighterTraceGaps,
} from "./highlighter-traces.mts";
import type { RouteTrace } from "./repo-source-traces.mts";

const modules = path.resolve("/workspace/node_modules/.pnpm");
const highlighterFile = path.join(
  modules,
  "@farming-labs+next@0.2.152/node_modules/@farming-labs/next/dist/mdx-plugins/rehype-code.mjs",
);
const runtimeFiles = [
  path.join(modules, "shiki@4.5.0/node_modules/shiki/dist/index.mjs"),
  path.join(modules, "shiki@4.5.0/node_modules/shiki/dist/wasm.mjs"),
];

const trace = (name: string, files: readonly string[]): RouteTrace => {
  const filePath = path.resolve(
    `/workspace/apps/docs/.next/server/app/api/${name}/route.js.nft.json`,
  );
  return {
    filePath,
    files: files.map((file) => path.relative(path.dirname(filePath), file)),
  };
};

describe("findHighlighterTraceGaps", () => {
  it("accepts a bundle that ships the highlighter with every file it imports at runtime", () => {
    expect(
      findHighlighterTraceGaps(
        [trace("mcp", [highlighterFile, ...runtimeFiles])],
        highlighterFile,
        runtimeFiles,
      ),
    ).toEqual([]);
  });

  it("reports a bundle that ships the highlighter without a runtime file", () => {
    const partial = trace("mcp", [highlighterFile, runtimeFiles[0]!]);

    expect(
      findHighlighterTraceGaps([partial], highlighterFile, runtimeFiles),
    ).toEqual([
      { filePath: partial.filePath, missingFiles: [runtimeFiles[1]] },
    ]);
  });

  it("ignores a bundle that does not ship the highlighter", () => {
    expect(
      findHighlighterTraceGaps(
        [trace("health", [runtimeFiles[0]!])],
        highlighterFile,
        runtimeFiles,
      ),
    ).toEqual([]);
  });
});

describe("findRoutesWithoutHighlighter", () => {
  it("reports a required route whose bundle no longer ships the highlighter", () => {
    const mcp = trace("mcp", [highlighterFile]);
    const markdown = trace("markdown", []);

    expect(
      findRoutesWithoutHighlighter([mcp, markdown], highlighterFile, [
        mcp.filePath,
        markdown.filePath,
      ]),
    ).toEqual([markdown.filePath]);
  });
});

describe("formatHighlighterTraceGaps", () => {
  it("names each bundle and the files it is missing", () => {
    const root = path.resolve("/workspace/apps/docs/.next/server");
    const partial = trace("mcp", [highlighterFile]);

    expect(
      formatHighlighterTraceGaps(root, [
        { filePath: partial.filePath, missingFiles: [runtimeFiles[1]!] },
      ]),
    ).toBe(
      [
        "1 server bundle ships the code highlighter without the Shiki files it imports at runtime:",
        `${path.join("app", "api", "mcp", "route.js.nft.json")}:`,
        `  ${path.relative(root, runtimeFiles[1]!)}`,
      ].join("\n"),
    );
  });
});
