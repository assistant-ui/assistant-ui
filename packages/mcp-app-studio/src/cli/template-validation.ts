import fs from "node:fs";
import path from "node:path";

export const REQUIRED_TEMPLATE_PATHS = [
  "package.json",
  "scripts/dev.ts",
  "scripts/export.ts",
  "lib/workbench/component-registry.tsx",
  "lib/workbench/wrappers/index.ts",
  "components/examples/index.ts",
  "lib/workbench/store.ts",
] as const;

export function validateTemplateDir(templateDir: string): void {
  const missing = REQUIRED_TEMPLATE_PATHS.filter(
    (p) => !fs.existsSync(path.join(templateDir, p)),
  );
  if (missing.length > 0) {
    throw new Error(
      `Template validation failed. Missing expected files:\n${missing
        .map((p) => `- ${p}`)
        .join(
          "\n",
        )}\n\nThis may indicate the starter template has changed. Try updating mcp-app-studio or set MCP_APP_STUDIO_TEMPLATE_REPO / MCP_APP_STUDIO_TEMPLATE_REF to a compatible template.`,
    );
  }
}
