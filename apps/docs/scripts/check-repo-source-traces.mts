import { promises as fs } from "node:fs";
import path from "node:path";
import {
  findIncompleteRouteTraces,
  formatIncompleteRouteTraces,
  getTracedSourceFiles,
  type RouteTrace,
} from "./repo-source-traces.mts";

const DOCS_ROOT = process.cwd();
const SOURCE_ROOT = path.join(DOCS_ROOT, "generated", ".repo-source");
const SERVER_ROOT = path.join(DOCS_ROOT, ".next", "server");
const REQUIRED_REPO_SOURCE_ROUTE_TRACES = [
  "app/api/doc/chat/route.js.nft.json",
  "app/api/xulux/chat/route.js.nft.json",
  "app/api/xulux/demo-download/route.js.nft.json",
  "app/api/xulux/learn/chat/route.js.nft.json",
  "app/api/xulux/learn/download/route.js.nft.json",
  "app/api/xulux/learn/source/route.js.nft.json",
] as const;

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
  const missingRequiredTracePaths = [...requiredTracePaths].filter(
    (file) => !emittedTracePaths.has(file),
  );

  if (missingRequiredTracePaths.length > 0) {
    console.error(
      [
        "Required repo-source route traces were not emitted:",
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

  if (incomplete.length > 0) {
    console.error(
      formatIncompleteRouteTraces(SOURCE_ROOT, sourceFiles.length, incomplete),
    );
    process.exitCode = 1;
    return;
  }

  const tracedRouteCount = routeTraces.filter(
    (trace) => getTracedSourceFiles(SOURCE_ROOT, trace).size > 0,
  ).length;
  console.log(
    `Verified ${routeTraces.length} server bundles: ${tracedRouteCount} trace all ${sourceFiles.length} repo-source files and ${routeTraces.length - tracedRouteCount} trace none.`,
  );
}

await main();
