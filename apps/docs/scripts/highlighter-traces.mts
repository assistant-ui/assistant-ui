import { realpathSync } from "node:fs";
import path from "node:path";
import type { RouteTrace } from "./repo-source-traces.mts";

export type HighlighterTraceGap = {
  readonly filePath: string;
  readonly missingFiles: readonly string[];
};

// A trace may name a package file through a pnpm symlink, while require.resolve
// returns the real path, so both sides are compared as real paths.
export function toRealTraces(routeTraces: readonly RouteTrace[]): RouteTrace[] {
  const realpaths = new Map<string, string>();
  const toRealpath = (file: string) => {
    let real = realpaths.get(file);
    if (real === undefined) {
      try {
        real = realpathSync(file);
      } catch (error) {
        if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
        real = file;
      }
      realpaths.set(file, real);
    }
    return real;
  };
  return routeTraces.map((trace) => ({
    filePath: trace.filePath,
    files: trace.files.map((file) =>
      toRealpath(path.resolve(path.dirname(trace.filePath), file)),
    ),
  }));
}

const resolveTracedFiles = (trace: RouteTrace) =>
  new Set(
    trace.files.map((file) => path.resolve(path.dirname(trace.filePath), file)),
  );

export const shipsHighlighter = (trace: RouteTrace, highlighterFile: string) =>
  resolveTracedFiles(trace).has(highlighterFile);

export function findHighlighterTraceGaps(
  routeTraces: readonly RouteTrace[],
  highlighterFile: string,
  runtimeFiles: readonly string[],
): HighlighterTraceGap[] {
  return routeTraces.flatMap((trace) => {
    const tracedFiles = resolveTracedFiles(trace);
    if (!tracedFiles.has(highlighterFile)) return [];

    const missingFiles = runtimeFiles.filter((file) => !tracedFiles.has(file));
    return missingFiles.length === 0
      ? []
      : [{ filePath: trace.filePath, missingFiles }];
  });
}

export function findRoutesWithoutHighlighter(
  routeTraces: readonly RouteTrace[],
  highlighterFile: string,
  requiredTracePaths: readonly string[],
): string[] {
  const highlighted = new Set(
    routeTraces
      .filter((trace) => shipsHighlighter(trace, highlighterFile))
      .map((trace) => path.resolve(trace.filePath)),
  );
  return requiredTracePaths.filter(
    (file) => !highlighted.has(path.resolve(file)),
  );
}

export function formatHighlighterTraceGaps(
  root: string,
  gaps: readonly HighlighterTraceGap[],
) {
  return [
    `${gaps.length} server ${gaps.length === 1 ? "bundle ships" : "bundles ship"} the code highlighter without the Shiki files it imports at runtime:`,
    ...gaps.flatMap((gap) => [
      `${path.relative(root, gap.filePath)}:`,
      ...gap.missingFiles.map((file) => `  ${path.relative(root, file)}`),
    ]),
  ].join("\n");
}
