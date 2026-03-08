import fs from "node:fs";
import path from "node:path";

export function isValidProjectPath(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || name.trim() === "") {
    return { valid: false, error: "Project name is required" };
  }

  const trimmed = name.trim();

  if (path.isAbsolute(trimmed)) {
    return {
      valid: false,
      error:
        "Absolute paths are not allowed. Use a relative path or project name.",
    };
  }

  if (trimmed.includes("..")) {
    return {
      valid: false,
      error: "Path traversal (..) is not allowed. Use a simple project name.",
    };
  }

  const cwd = process.cwd();
  const resolved = path.resolve(cwd, trimmed);
  const relative = path.relative(cwd, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return {
      valid: false,
      error: "Project must be created within current directory.",
    };
  }

  return { valid: true };
}

export function isValidPackageName(name: string): boolean {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(
    name,
  );
}

export function toValidPackageName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^[._]/, "")
    .replace(/[^a-z0-9-~]+/g, "-");
}

export function isEmpty(dir: string): boolean {
  if (!fs.existsSync(dir)) return true;
  const files = fs.readdirSync(dir);
  return files.length === 0 || (files.length === 1 && files[0] === ".git");
}

export function emptyDir(dir: string): void {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    // Preserve git history when scaffolding into an existing repo.
    if (file === ".git") continue;
    fs.rmSync(path.join(dir, file), { recursive: true, force: true });
  }
}

// Dependency versions to ensure compatibility
const DEPENDENCY_OVERRIDES: Record<string, string> = {
  "@assistant-ui/react": "^0.12.3",
  "@assistant-ui/react-ai-sdk": "^1.3.3",
  "@assistant-ui/react-markdown": "^0.12.1",
};

export function updatePackageJson(
  dir: string,
  name: string,
  description?: string,
  opts?: {
    mcpAppStudioVersion?: string;
  },
): void {
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) return;

  try {
    const content = fs.readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(content) as Record<string, unknown>;
    pkg["name"] = name;
    pkg["version"] = "0.1.0";
    pkg["private"] = true;
    if (description) {
      pkg["description"] = description;
    }

    // Update dependencies to compatible versions
    const deps = (pkg["dependencies"] as Record<string, string>) ?? {};
    if (opts?.mcpAppStudioVersion && opts.mcpAppStudioVersion !== "0.0.0") {
      deps["mcp-app-studio"] = `^${opts.mcpAppStudioVersion}`;
    }
    for (const [dep, version] of Object.entries(DEPENDENCY_OVERRIDES)) {
      if (deps[dep]) {
        deps[dep] = version;
      }
    }
    pkg["dependencies"] = deps;
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  } catch (error) {
    throw new Error(
      `Failed to update package.json: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function detectPackageManager(): "npm" | "pnpm" | "yarn" | "bun" {
  const ua = process.env["npm_config_user_agent"] ?? "";
  if (ua.includes("pnpm")) return "pnpm";
  if (ua.includes("yarn")) return "yarn";
  if (ua.includes("bun")) return "bun";
  return "npm";
}
