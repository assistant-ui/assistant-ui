import path from "node:path";
import fs from "node:fs";

export function getPackageInfo() {
  const packageJsonPath = path.join("package.json");

  return JSON.parse(fs.readFileSync(packageJsonPath).toString("utf-8")) as {
    version: string;
  };
}
