import fs from "node:fs";
import path from "node:path";

export interface TemplateManifest {
  id: string;
  defaultComponent: string;
  exportConfig: { entryPoint: string; exportName: string };
  deleteGlobs: string[];
}

/** Check if the extracted starter repo contains template overlays. */
export function hasOverlayTemplates(targetDir: string): boolean {
  return fs.existsSync(path.join(targetDir, "templates"));
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
  const raw = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Record<
    string,
    unknown
  >;

  if (typeof raw.id !== "string")
    throw new Error("template.json: missing 'id'");
  if (typeof raw.defaultComponent !== "string")
    throw new Error("template.json: missing 'defaultComponent'");
  if (!raw.exportConfig || typeof raw.exportConfig !== "object")
    throw new Error("template.json: missing 'exportConfig'");
  const ec = raw.exportConfig as Record<string, unknown>;
  if (typeof ec.entryPoint !== "string")
    throw new Error("template.json: missing 'exportConfig.entryPoint'");
  if (typeof ec.exportName !== "string")
    throw new Error("template.json: missing 'exportConfig.exportName'");
  if (!Array.isArray(raw.deleteGlobs))
    throw new Error("template.json: missing 'deleteGlobs' array");

  return raw as unknown as TemplateManifest;
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
 * 3. Delete files listed in deleteGlobs
 * 4. Remove templates/ directory
 */
export function applyOverlayTemplate(
  targetDir: string,
  templateId: string,
): TemplateManifest {
  const manifest = loadTemplateManifest(targetDir, templateId);
  const overlayDir = path.join(targetDir, "templates", templateId);

  copyOverlayFiles(overlayDir, targetDir);

  for (const glob of manifest.deleteGlobs) {
    const target = path.join(targetDir, glob);
    fs.rmSync(target, { recursive: true, force: true });
  }

  fs.rmSync(path.join(targetDir, "templates"), {
    recursive: true,
    force: true,
  });

  return manifest;
}
