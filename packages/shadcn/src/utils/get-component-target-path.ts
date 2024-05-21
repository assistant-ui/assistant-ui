import path from "node:path";
import type { Config } from "./get-config";

export function getComponentTargetPath(config: Config) {
  if (config.aliases.ui) {
    return config.resolvedPaths.ui;
  }

  const [parent, type] = ["components", "ui"];
  if (!(parent in config.resolvedPaths)) {
    return null;
  }

  return path.join(
    config.resolvedPaths[parent as keyof typeof config.resolvedPaths],
    type,
  );
}
