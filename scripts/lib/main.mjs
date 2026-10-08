import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function isExecutedAsMain(metaUrl, argv1) {
  if (!argv1) return false;
  try {
    return realpathSync(fileURLToPath(metaUrl)) === realpathSync(argv1);
  } catch {
    return false;
  }
}
