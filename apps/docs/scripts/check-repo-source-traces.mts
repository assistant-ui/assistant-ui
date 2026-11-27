import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  findHighlighterTraceGaps,
  findRoutesWithoutHighlighter,
  formatHighlighterTraceGaps,
  shipsHighlighter,
  toRealTraces,
} from "./highlighter-traces.mts";
import {
  findIncompleteRouteTraces,
  formatIncompleteRouteTraces,
  getTracedSourceFiles,
  type RouteTrace,
} from "./repo-source-traces.mts";

const DOCS_ROOT = process.cwd();
const SOURCE_ROOT = path.join(DOCS_ROOT, "generated", ".repo-source");
const SERVER_ROOT = path.join(DOCS_ROOT, ".next", "server");
// This intentionally duplicates next.config.mts: deriving it from that config
// would also remove the requirement when an include is accidentally deleted.
const REQUIRED_REPO_SOURCE_ROUTE_TRACES = [
  "app/api/doc/chat/route.js.nft.json",
  "app/api/xulux/chat/route.js.nft.json",
  "app/api/xulux/demo-download/route.js.nft.json",
  "app/api/xulux/learn/chat/route.js.nft.json",
  "app/api/xulux/learn/download/route.js.nft.json",
  "app/api/xulux/learn/source/route.js.nft.json",
] as const;
const REQUIRED_HIGHLIGHTER_ROUTE_TRACES = [
  "app/api/mcp/route.js.nft.json",
  "app/(home)/llms.mdx/[[...slug]]/route.js.nft.json",
] as const;

// @farming-labs/next/mdx-plugins/rehype-code imports Shiki through runtime
// file URLs that the tracer cannot follow, so a bundle has these files only
// because Fumadocs imports the same entries by name. Resolve them the same way.
function resolveHighlighterFiles() {
  const highlighterFile = createRequire(
    path.join(DOCS_ROOT, "package.json"),
  ).resolve("@farming-labs/next/mdx-plugins/rehype-code");
  const fumadocs = createRequire(
    createRequire(highlighterFile).resolve(
      "fumadocs-core/mdx-plugins/rehype-code",
    ),
  );
  const shikiEntry = fumadocs.resolve("shiki");
  const shiki = createRequire(shikiEntry);
  return {
    highlighterFile,
    runtimeFiles: [
      shikiEntry,
      fumadocs.resolve("shiki/core"),
      fumadocs.resolve("shiki/wasm"),
      shiki.resolve("@shikijs/langs/typescript"),
      shiki.resolve("@shikijs/themes/catppuccin-latte"),
      shiki.resolve("@shikijs/themes/catppuccin-mocha"),
    ],
  };
}

function checkHighlighterTraces(tracesOnDisk: readonly RouteTrace[]) {
  const routeTraces = toRealTraces(tracesOnDisk);
  const { highlighterFile, runtimeFiles } = resolveHighlighterFiles();
  const unhighlighted = findRoutesWithoutHighlighter(
    routeTraces,
    highlighterFile,
    REQUIRED_HIGHLIGHTER_ROUTE_TRACES.map((file) =>
      path.join(SERVER_ROOT, file),
    ),
  );
  const gaps = findHighlighterTraceGaps(
    routeTraces,
    highlighterFile,
    runtimeFiles,
  );
  const highlightedCount = routeTraces.filter((trace) =>
    shipsHighlighter(trace, highlighterFile),
  ).length;
  return {
    highlightedCount,
    problems: [
      ...(unhighlighted.length === 0
        ? []
        : [
            [
              "These routes highlight code at request time, but their traces no longer include @farming-labs/next/mdx-plugins/rehype-code. Keep @farming-labs/next in serverExternalPackages, or update this check:",
              ...unhighlighted.map(
                (file) => `  ${path.relative(SERVER_ROOT, file)}`,
              ),
            ].join("\n"),
          ]),
      ...(gaps.length === 0
        ? []
        : [formatHighlighterTraceGaps(SERVER_ROOT, gaps)]),
    ],
  };
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const filePath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(filePath) : [filePath];
    }),
  );
  return files.flat();
}

async function readRouteTrace(filePath: string): Promise<RouteTrace> {
  const parsed: unknown = JSON.parse(await fs.readFile(filePath, "utf-8"));
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    !("files" in parsed) ||
    !Array.isArray(parsed.files) ||
    parsed.files.some((file) => typeof file !== "string")
  ) {
    throw new Error(`Invalid Next.js trace file: ${filePath}`);
  }

  return { filePath, files: parsed.files as string[] };
}

async function main() {
  const [sourceFiles, serverTracePaths] = await Promise.all([
    listFiles(SOURCE_ROOT),
    listFiles(SERVER_ROOT).then((files) =>
      files.filter((file) => file.endsWith(".js.nft.json")),
    ),
  ]);

  if (sourceFiles.length === 0) {
    throw new Error(`Generated repo source tree is empty: ${SOURCE_ROOT}`);
  }
  if (serverTracePaths.length === 0) {
    throw new Error(`No Next.js server traces found under ${SERVER_ROOT}`);
  }

  const requiredTracePaths = new Set(
    REQUIRED_REPO_SOURCE_ROUTE_TRACES.map((file) =>
      path.join(SERVER_ROOT, file),
    ),
  );
  const emittedTracePaths = new Set(serverTracePaths);
  const missingRequiredTracePaths = [
    ...REQUIRED_REPO_SOURCE_ROUTE_TRACES,
    ...REQUIRED_HIGHLIGHTER_ROUTE_TRACES,
  ]
    .map((file) => path.join(SERVER_ROOT, file))
    .filter((file) => !emittedTracePaths.has(file));

  if (missingRequiredTracePaths.length > 0) {
    console.error(
      [
        "Required route traces were not emitted:",
        ...missingRequiredTracePaths.map((file) =>
          path.relative(SERVER_ROOT, file),
        ),
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  const routeTraces = await Promise.all(serverTracePaths.map(readRouteTrace));
  const incomplete = findIncompleteRouteTraces(
    SOURCE_ROOT,
    sourceFiles,
    routeTraces,
    requiredTracePaths,
  );
  const highlighter = checkHighlighterTraces(routeTraces);

  if (incomplete.length > 0) {
    console.error(
      formatIncompleteRouteTraces(SOURCE_ROOT, sourceFiles.length, incomplete),
    );
  }
  for (const problem of highlighter.problems) console.error(problem);
  if (incomplete.length > 0 || highlighter.problems.length > 0) {
    process.exitCode = 1;
    return;
  }

  const tracedRouteCount = routeTraces.filter(
    (trace) => getTracedSourceFiles(SOURCE_ROOT, trace).size > 0,
  ).length;
  console.log(
    `Verified ${routeTraces.length} server bundles: ${tracedRouteCount} trace all ${sourceFiles.length} repo-source files and ${routeTraces.length - tracedRouteCount} trace none; ${highlighter.highlightedCount} ship the code highlighter with the Shiki files it imports.`,
  );
}

await main();
