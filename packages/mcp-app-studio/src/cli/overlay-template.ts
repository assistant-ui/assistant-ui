import fs from "node:fs";
import path from "node:path";

export interface TemplateManifest {
  id: string;
  defaultComponent: string;
  exportConfig: { entryPoint: string; exportName: string };
  deletePaths: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureRelativePathInsideRoot(
  rootDir: string,
  relativePath: string,
  fieldName: string,
): string {
  if (path.isAbsolute(relativePath)) {
    throw new Error(`${fieldName}: absolute paths are not allowed`);
  }

  const normalized = path.normalize(relativePath);
  const resolved = path.resolve(rootDir, normalized);
  if (resolved !== rootDir && !resolved.startsWith(`${rootDir}${path.sep}`)) {
    throw new Error(`${fieldName}: path traversal is not allowed`);
  }

  return relativePath;
}

/** Check if the extracted starter repo contains template overlays. */
export function hasOverlayTemplates(targetDir: string): boolean {
  const templatesDir = path.join(targetDir, "templates");
  return fs.existsSync(templatesDir) && fs.statSync(templatesDir).isDirectory();
}

/** List available overlay template IDs from templates/* directories. */
export function listOverlayTemplateIds(targetDir: string): string[] {
  const templatesDir = path.join(targetDir, "templates");
  if (
    !fs.existsSync(templatesDir) ||
    !fs.statSync(templatesDir).isDirectory()
  ) {
    return [];
  }

  return fs
    .readdirSync(templatesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** Read and validate a template.json manifest. */
export function loadTemplateManifest(
  targetDir: string,
  templateId: string,
): TemplateManifest {
  const manifestPath = path.join(
    targetDir,
    "templates",
    templateId,
    "template.json",
  );
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Template overlay "${templateId}" not found. Expected ${manifestPath}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  } catch {
    throw new Error("template.json: invalid JSON");
  }

  if (!isRecord(parsed)) {
    throw new Error("template.json: expected an object");
  }

  if (typeof parsed.id !== "string")
    throw new Error("template.json: missing 'id'");
  if (parsed.id !== templateId) {
    throw new Error(
      `template.json: id "${parsed.id}" does not match template directory "${templateId}"`,
    );
  }

  if (typeof parsed.defaultComponent !== "string")
    throw new Error("template.json: missing 'defaultComponent'");
  if (!parsed.exportConfig || typeof parsed.exportConfig !== "object")
    throw new Error("template.json: missing 'exportConfig'");
  const ec = parsed.exportConfig as Record<string, unknown>;
  if (typeof ec.entryPoint !== "string")
    throw new Error("template.json: missing 'exportConfig.entryPoint'");
  if (typeof ec.exportName !== "string")
    throw new Error("template.json: missing 'exportConfig.exportName'");
  if (!Array.isArray(parsed.deletePaths))
    throw new Error("template.json: missing 'deletePaths' array");

  const templatesRoot = path.join(targetDir);
  const deletePaths = parsed.deletePaths.map((value, index) => {
    if (typeof value !== "string") {
      throw new Error(
        `template.json: deletePaths[${index}] must be a string path`,
      );
    }
    return ensureRelativePathInsideRoot(
      templatesRoot,
      value,
      `template.json: deletePaths[${index}]`,
    );
  });

  return {
    id: parsed.id,
    defaultComponent: parsed.defaultComponent,
    exportConfig: {
      entryPoint: ec.entryPoint,
      exportName: ec.exportName,
    },
    deletePaths,
  };
}

function copyOverlayFiles(overlayDir: string, targetDir: string): void {
  const entries = fs.readdirSync(overlayDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "template.json") continue;
    const srcPath = path.join(overlayDir, entry.name);
    const destPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyOverlayFiles(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Apply a template overlay:
 * 1. Read template.json
 * 2. Copy overlay files over base
 * 3. Delete files listed in deletePaths
 * 4. Remove templates/ directory
 */
export function applyOverlayTemplate(
  targetDir: string,
  templateId: string,
): TemplateManifest {
  const manifest = loadTemplateManifest(targetDir, templateId);
  const overlayDir = path.join(targetDir, "templates", templateId);

  copyOverlayFiles(overlayDir, targetDir);

  for (let index = 0; index < manifest.deletePaths.length; index++) {
    const deletePath = manifest.deletePaths[index];
    if (!deletePath) continue;

    const target = path.resolve(
      targetDir,
      ensureRelativePathInsideRoot(
        targetDir,
        deletePath,
        `template.json: deletePaths[${index}]`,
      ),
    );
    fs.rmSync(target, { recursive: true, force: true });
  }

  fs.rmSync(path.join(targetDir, "templates"), {
    recursive: true,
    force: true,
  });

  return manifest;
}
