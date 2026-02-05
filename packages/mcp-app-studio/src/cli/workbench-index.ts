import fs from "node:fs";
import path from "node:path";

function generateWorkbenchIndexExport(components: string[]): string {
  const exports: string[] = [];
  if (components.includes("welcome")) {
    exports.push("WelcomeCardSDK");
  }
  if (components.includes("poi-map")) {
    exports.push("POIMapSDK");
  }
  return exports.length > 0
    ? `export { ${exports.join(", ")} } from "./wrappers";`
    : "// No SDK exports";
}

export function updateWorkbenchIndex(
  targetDir: string,
  components: string[],
): void {
  const indexPath = path.join(targetDir, "lib/workbench/index.ts");
  if (!fs.existsSync(indexPath)) return;

  let content = fs.readFileSync(indexPath, "utf-8");

  const wrappersExportRegex = /export \{[^}]*\} from "\.\/wrappers";/;
  const newExport = generateWorkbenchIndexExport(components);

  if (wrappersExportRegex.test(content)) {
    content = content.replace(wrappersExportRegex, newExport);
  } else {
    content = `${content.trimEnd()}\n\n${newExport}\n`;
  }

  fs.writeFileSync(indexPath, content);
}
