import * as fs from "node:fs";
import * as path from "node:path";

export function resolveRealPath(inputPath: string): string {
  const resolved = path.resolve(inputPath);

  try {
    return fs.realpathSync(resolved);
  } catch {
    return resolved;
  }
}

export function findWorkspaceRoot(cwd: string): string | null {
  let dir = path.resolve(cwd);
  const root = path.parse(dir).root;

  while (true) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;

    const pkgPath = path.join(dir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.workspaces) return dir;
      } catch {
        // Malformed package manifests are not workspace markers.
      }
    }

    if (dir === root) return null;
    dir = path.dirname(dir);
  }
}
