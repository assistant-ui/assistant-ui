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
const ROUTES_ROOT = path.join(DOCS_ROOT, ".next", "server", "app");

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
  const [sourceFiles, routeTracePaths] = await Promise.all([
    listFiles(SOURCE_ROOT),
    listFiles(ROUTES_ROOT).then((files) =>
      files.filter((file) => file.endsWith(`${path.sep}route.js.nft.json`)),
    ),
  ]);

  if (sourceFiles.length === 0) {
    throw new Error(`Generated repo source tree is empty: ${SOURCE_ROOT}`);
  }
  if (routeTracePaths.length === 0) {
    throw new Error(`No Next.js route traces found under ${ROUTES_ROOT}`);
  }

  const routeTraces = await Promise.all(routeTracePaths.map(readRouteTrace));
  const incomplete = findIncompleteRouteTraces(
    SOURCE_ROOT,
    sourceFiles,
    routeTraces,
  );

  if (incomplete.length > 0) {
    throw new Error(
      formatIncompleteRouteTraces(SOURCE_ROOT, sourceFiles.length, incomplete),
    );
  }

  const tracedRouteCount = routeTraces.filter(
    (trace) => getTracedSourceFiles(SOURCE_ROOT, trace).size > 0,
  ).length;
  console.log(
    `Verified ${routeTraces.length} route bundles: ${tracedRouteCount} trace all ${sourceFiles.length} repo-source files and ${routeTraces.length - tracedRouteCount} trace none.`,
  );
}

await main();
