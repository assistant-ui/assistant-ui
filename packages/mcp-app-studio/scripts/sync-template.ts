import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { extract } from "tar";

const TEMPLATE_REPO =
  process.env.MCP_APP_STUDIO_TEMPLATE_REPO ??
  "assistant-ui/mcp-app-studio-starter";
const TEMPLATE_BRANCH = process.env.MCP_APP_STUDIO_TEMPLATE_BRANCH ?? "main";

const PACKAGE_DIR = process.cwd();
const PREVIEW_DIR = path.join(PACKAGE_DIR, ".preview");

// Preserve local artifacts when re-syncing.
const PRESERVE_PATHS = [
  "node_modules",
  ".next",
  ".env.local",
  "server/node_modules",
  "server/.env",
  "server/.env.local",
] as const;

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

async function moveIfExists(from: string, to: string): Promise<boolean> {
  if (!(await exists(from))) return false;
  await ensureDir(path.dirname(to));
  await fs.rename(from, to);
  return true;
}

async function preservePreviewArtifacts(): Promise<{
  preserveDir: string;
  movedPaths: string[];
}> {
  const preserveDir = path.join(PACKAGE_DIR, `.preview-preserve-${Date.now()}`);
  const movedPaths: string[] = [];

  if (!(await exists(PREVIEW_DIR))) {
    return { preserveDir, movedPaths };
  }

  await ensureDir(preserveDir);

  for (const relativePath of PRESERVE_PATHS) {
    const from = path.join(PREVIEW_DIR, relativePath);
    const to = path.join(preserveDir, relativePath);
    if (await moveIfExists(from, to)) {
      movedPaths.push(relativePath);
    }
  }

  return { preserveDir, movedPaths };
}

async function restorePreviewArtifacts(
  preserveDir: string,
  movedPaths: string[],
): Promise<void> {
  for (const relativePath of movedPaths) {
    const from = path.join(preserveDir, relativePath);
    const to = path.join(PREVIEW_DIR, relativePath);
    await ensureDir(path.dirname(to));
    if (await exists(to)) {
      await fs.rm(to, { recursive: true, force: true });
    }
    await fs.rename(from, to);
  }
}

async function downloadAndExtractTemplate(): Promise<void> {
  const tarballUrl = `https://github.com/${TEMPLATE_REPO}/archive/refs/heads/${TEMPLATE_BRANCH}.tar.gz`;
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "mcp-app-studio-preview-"),
  );
  const tarballPath = path.join(tempDir, "template.tar.gz");

  try {
    const response = await fetch(tarballUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to download template: ${response.status} ${response.statusText}`,
      );
    }

    const body = response.body;
    if (!body) {
      throw new Error("No response body received");
    }

    const fileStream = createWriteStream(tarballPath);
    const nodeStream = Readable.fromWeb(
      body as Parameters<typeof Readable.fromWeb>[0],
    );
    await pipeline(nodeStream, fileStream);

    await extract({
      file: tarballPath,
      cwd: PREVIEW_DIR,
      strip: 1, // Remove top-level directory in tarball
    });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function patchPreviewPackageJson(): Promise<void> {
  const pkgPath = path.join(PREVIEW_DIR, "package.json");
  if (!(await exists(pkgPath))) return;

  const raw = await fs.readFile(pkgPath, "utf-8");
  const pkg = JSON.parse(raw) as Record<string, unknown>;
  const deps = (pkg["dependencies"] as Record<string, string>) ?? {};

  // Point the preview app at the local package under development.
  deps["mcp-app-studio"] = "file:..";
  pkg["dependencies"] = deps;

  await fs.writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf-8");
}

async function main() {
  console.log(`Syncing template → ${PREVIEW_DIR}`);
  console.log(`Template: ${TEMPLATE_REPO}@${TEMPLATE_BRANCH}`);

  const { preserveDir, movedPaths } = await preservePreviewArtifacts();

  // Reset preview dir to template contents.
  await fs.rm(PREVIEW_DIR, { recursive: true, force: true });
  await ensureDir(PREVIEW_DIR);

  try {
    await downloadAndExtractTemplate();
    await patchPreviewPackageJson();
    await restorePreviewArtifacts(preserveDir, movedPaths);
  } finally {
    await fs.rm(preserveDir, { recursive: true, force: true }).catch(() => {});
  }

  console.log("Done.");
  console.log("");
  console.log("Next steps:");
  console.log("  pnpm preview:install   # first time only");
  console.log("  pnpm preview:dev");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
