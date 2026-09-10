import path from "node:path";
import {
  findIncompleteRouteTraces,
  formatIncompleteRouteTraces,
  type RouteTrace,
} from "./repo-source-traces.mts";

const sourceRoot = path.resolve("/workspace/apps/docs/generated/.repo-source");
const sourceFiles = ["a.ts", "nested/b.ts"].map((file) =>
  path.join(sourceRoot, file),
);

const trace = (name: string, files: readonly string[]): RouteTrace => {
  const filePath = path.resolve(
    `/workspace/apps/docs/.next/server/app/api/${name}/route.js.nft.json`,
  );
  return {
    filePath,
    files: files.map((file) => path.relative(path.dirname(filePath), file)),
  };
};

describe("findIncompleteRouteTraces", () => {
  it("accepts route bundles that trace the complete source tree or none of it", () => {
    const routeTraces = [
      trace("full", [...sourceFiles, ...sourceFiles]),
      trace("empty", [path.resolve("/workspace/apps/docs/package.json")]),
    ];

    expect(
      findIncompleteRouteTraces(sourceRoot, sourceFiles, routeTraces),
    ).toEqual([]);
  });

  it("reports a route bundle that traces only part of the source tree", () => {
    const filePath = trace("partial", [sourceFiles[0]!]).filePath;

    expect(
      findIncompleteRouteTraces(sourceRoot, sourceFiles, [
        trace("partial", [sourceFiles[0]!]),
      ]),
    ).toEqual([
      {
        filePath,
        tracedFileCount: 1,
        missingFiles: [sourceFiles[1]!],
        unexpectedFiles: [],
      },
    ]);
  });

  it("reports a required route bundle that traces none of the source tree", () => {
    const emptyTrace = trace("required", [
      path.resolve("/workspace/apps/docs/package.json"),
    ]);

    expect(
      findIncompleteRouteTraces(
        sourceRoot,
        sourceFiles,
        [emptyTrace],
        new Set([emptyTrace.filePath]),
      ),
    ).toEqual([
      {
        filePath: emptyTrace.filePath,
        tracedFileCount: 0,
        missingFiles: sourceFiles,
        unexpectedFiles: [],
      },
    ]);
  });

  it("reports stale traced files that are not in the generated tree", () => {
    const staleFile = path.join(sourceRoot, "deleted.ts");
    const result = findIncompleteRouteTraces(sourceRoot, sourceFiles, [
      trace("stale", [...sourceFiles, staleFile]),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.unexpectedFiles).toEqual([staleFile]);
  });
});

describe("formatIncompleteRouteTraces", () => {
  it("explains the invariant and lists missing files", () => {
    const incomplete = findIncompleteRouteTraces(sourceRoot, sourceFiles, [
      trace("partial", [sourceFiles[0]!]),
    ]);
    const output = formatIncompleteRouteTraces(
      sourceRoot,
      sourceFiles.length,
      incomplete,
    );

    expect(output).toContain("incomplete repo-source trace");
    expect(output).toContain("traced 1 of 2 source files");
    expect(output).toContain(`Missing (1):\n  nested${path.sep}b.ts`);
  });
});
