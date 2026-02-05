import fs from "node:fs";
import path from "node:path";

export function getVersionFromCliDir(cliDir: string): string {
  try {
    const candidatePaths = [
      path.resolve(cliDir, "../../package.json"),
      path.resolve(cliDir, "../package.json"),
      path.resolve(cliDir, "../../../package.json"),
    ];

    for (const pkgPath of candidatePaths) {
      if (!fs.existsSync(pkgPath)) continue;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
        version?: string;
      };
      if (pkg.version) return pkg.version;
    }

    return "0.0.0";
  } catch {
    return "0.0.0";
  }
}
