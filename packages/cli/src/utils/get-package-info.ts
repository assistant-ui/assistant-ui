import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export function getPackageInfo() {
  // Convert the current module URL to a file path
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const packageJsonPath = path.join(__dirname, "..", "package.json");

  return JSON.parse(fs.readFileSync(packageJsonPath).toString("utf-8")) as {
    version: string;
  };
}
