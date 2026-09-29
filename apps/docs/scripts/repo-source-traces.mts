import path from "node:path";

export type RouteTrace = {
  readonly filePath: string;
  readonly files: readonly string[];
};

export type IncompleteRouteTrace = {
  readonly filePath: string;
  readonly tracedFileCount: number;
  readonly missingFiles: readonly string[];
  readonly unexpectedFiles: readonly string[];
};

const isWithin = (root: string, candidate: string) =>
  candidate === root || candidate.startsWith(`${root}${path.sep}`);

export function getTracedSourceFiles(
  sourceRoot: string,
  trace: RouteTrace,
): Set<string> {
  const resolvedRoot = path.resolve(sourceRoot);
  return new Set(
    trace.files
      .map((file) => path.resolve(path.dirname(trace.filePath), file))
      .filter((file) => isWithin(resolvedRoot, file)),
  );
}

export function findIncompleteRouteTraces(
  sourceRoot: string,
  sourceFiles: readonly string[],
  routeTraces: readonly RouteTrace[],
  requiredTracePaths: ReadonlySet<string> = new Set(),
): IncompleteRouteTrace[] {
  const sourceSet = new Set(sourceFiles.map((file) => path.resolve(file)));
  const requiredTraceSet = new Set(
    [...requiredTracePaths].map((file) => path.resolve(file)),
  );

  return routeTraces.flatMap((trace) => {
    const tracedSourceFiles = getTracedSourceFiles(sourceRoot, trace);

    if (
      tracedSourceFiles.size === 0 &&
      !requiredTraceSet.has(path.resolve(trace.filePath))
    ) {
      return [];
    }

    const missingFiles = [...sourceSet]
      .filter((file) => !tracedSourceFiles.has(file))
      .sort();
    const unexpectedFiles = [...tracedSourceFiles]
      .filter((file) => !sourceSet.has(file))
      .sort();

    if (missingFiles.length === 0 && unexpectedFiles.length === 0) return [];

    return [
      {
        filePath: trace.filePath,
        tracedFileCount: tracedSourceFiles.size,
        missingFiles,
        unexpectedFiles,
      },
    ];
  });
}

const formatSample = (label: string, files: readonly string[], root: string) =>
  files.length === 0
    ? []
    : [
        `${label} (${files.length}):`,
        ...files.slice(0, 5).map((file) => `  ${path.relative(root, file)}`),
        ...(files.length > 5 ? [`  ...and ${files.length - 5} more`] : []),
      ];

export function formatIncompleteRouteTraces(
  sourceRoot: string,
  sourceFileCount: number,
  incomplete: readonly IncompleteRouteTrace[],
) {
  return [
    `Found ${incomplete.length} server bundle${incomplete.length === 1 ? "" : "s"} with an incomplete repo-source trace.`,
    "Required routes must trace the complete generated repo source tree; every other bundle must trace all or none of it.",
    "",
    ...incomplete.flatMap((trace, index) => [
      ...(index === 0 ? [] : [""]),
      `${trace.filePath}: traced ${trace.tracedFileCount} of ${sourceFileCount} source files`,
      ...formatSample("Missing", trace.missingFiles, sourceRoot),
      ...formatSample("Unexpected", trace.unexpectedFiles, sourceRoot),
    ]),
  ].join("\n");
}
