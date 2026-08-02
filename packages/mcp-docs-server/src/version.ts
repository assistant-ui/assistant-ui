import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PACKAGE_DIR } from "./constants.js";

export const SERVER_VERSION = JSON.parse(
  readFileSync(join(PACKAGE_DIR, "package.json"), "utf-8"),
).version as string;
