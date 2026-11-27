import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  findHighlighterTraceGaps,
  findRoutesWithoutHighlighter,
  formatHighlighterTraceGaps,
  shipsHighlighter,
  toRealTraces,
} from "./highlighter-traces.mts";
import type { RouteTrace } from "./repo-source-traces.mts";

const modules = path.resolve("/workspace/node_modules/.pnpm");
const highlighterFile = path.join(
  modules,
  "@farming-labs+next@0.2.152/node_modules/@farming-labs/next/dist/mdx-plugins/rehype-code.mjs",
);
const themes = path.join(
  modules,
  "@shikijs+themes@4.5.0/node_modules/@shikijs/themes/dist",
);
const latteTheme = path.join(themes, "catppuccin-latte.mjs");
const mochaTheme = path.join(themes, "catppuccin-mocha.mjs");
const runtimeFiles = [
  path.join(modules, "shiki@4.5.0/node_modules/shiki/dist/index.mjs"),
  path.join(modules, "shiki@4.5.0/node_modules/shiki/dist/wasm.mjs"),
  latteTheme,
  mochaTheme,
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

  it.each([
    ["light", latteTheme],
    ["dark", mochaTheme],
  ])(
    "reports a bundle that ships the highlighter without the %s theme",
    (_, theme) => {
      const partial = trace("mcp", [
        highlighterFile,
        ...runtimeFiles.filter((file) => file !== theme),
      ]);

      expect(
        findHighlighterTraceGaps([partial], highlighterFile, runtimeFiles),
      ).toEqual([{ filePath: partial.filePath, missingFiles: [theme] }]);
    },
  );

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

describe("toRealTraces", () => {
  let root: string;

  beforeEach(() => {
    root = realpathSync(
      mkdtempSync(path.join(os.tmpdir(), "highlighter-traces-")),
    );
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("reports a missing theme when a trace names the highlighter through a pnpm symlink", () => {
    const store = path.join(
      root,
      "node_modules/.pnpm/@farming-labs+next@0.2.152/node_modules/@farming-labs/next",
    );
    const realHighlighter = path.join(
      store,
      "dist/mdx-plugins/rehype-code.mjs",
    );
    mkdirSync(path.dirname(realHighlighter), { recursive: true });
    writeFileSync(realHighlighter, "");
    const link = path.join(root, "apps/docs/node_modules/@farming-labs/next");
    mkdirSync(path.dirname(link), { recursive: true });
    symlinkSync(store, link, "junction");
    const themeStore = path.join(
      root,
      "node_modules/.pnpm/@shikijs+themes@4.5.0/node_modules/@shikijs/themes/dist",
    );
    const realLatte = path.join(themeStore, "catppuccin-latte.mjs");
    const realMocha = path.join(themeStore, "catppuccin-mocha.mjs");
    mkdirSync(themeStore, { recursive: true });
    writeFileSync(realLatte, "");
    writeFileSync(realMocha, "");
    const filePath = path.join(
      root,
      "apps/docs/.next/server/app/api/mcp/route.js.nft.json",
    );
    const linked: RouteTrace = {
      filePath,
      files: [
        path.join(link, "dist/mdx-plugins/rehype-code.mjs"),
        realLatte,
      ].map((file) => path.relative(path.dirname(filePath), file)),
    };

    expect(shipsHighlighter(linked, realHighlighter)).toBe(false);
    const normalized = toRealTraces([linked]);
    expect(normalized).toEqual([
      { filePath, files: [realHighlighter, realLatte] },
    ]);
    expect(
      findHighlighterTraceGaps(normalized, realHighlighter, [
        realLatte,
        realMocha,
      ]),
    ).toEqual([{ filePath, missingFiles: [realMocha] }]);
  });

  it("keeps the path of a traced file that is not on disk", () => {
    const filePath = path.join(
      root,
      "apps/docs/.next/server/app/api/mcp/route.js.nft.json",
    );

    expect(
      toRealTraces([{ filePath, files: ["../../../../missing.mjs"] }]),
    ).toEqual([
      { filePath, files: [path.join(root, "apps/docs/.next/missing.mjs")] },
    ]);
  });

  it("rethrows a realpath error when a traced path traverses a file", () => {
    const filePath = path.join(root, "route.js.nft.json");
    writeFileSync(path.join(root, "module.mjs"), "");

    expect(() =>
      toRealTraces([{ filePath, files: ["module.mjs/child.mjs"] }]),
    ).toThrow(expect.objectContaining({ code: "ENOTDIR" }));
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
        { filePath: partial.filePath, missingFiles: [latteTheme] },
      ]),
    ).toBe(
      [
        "1 server bundle ships the code highlighter without the Shiki files it imports at runtime:",
        `${path.join("app", "api", "mcp", "route.js.nft.json")}:`,
        `  ${path.relative(root, latteTheme)}`,
      ].join("\n"),
    );
  });
});
