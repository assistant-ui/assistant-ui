import {
  type ConfigLoaderSuccessResult,
  createMatchPath,
} from "tsconfig-paths";

export function resolveImport(
  importPath: string,
  config: Pick<ConfigLoaderSuccessResult, "absoluteBaseUrl" | "paths">,
) {
  return createMatchPath(config.absoluteBaseUrl, config.paths)(
    importPath,
    undefined,
    () => true,
    [".ts", ".tsx"],
  );
}
