import path from "node:path";
import type { RouteTrace } from "./repo-source-traces.mts";

export type HighlighterTraceGap = {
  readonly filePath: string;
  readonly missingFiles: readonly string[];
};

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
