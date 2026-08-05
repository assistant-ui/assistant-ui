import { promises as fs } from "node:fs";
import path from "node:path";
import { codeToHtml } from "shiki";

const SOURCE_ROOTS = [
  ["..", "..", "packages", "ui", "src", "components", "elements"],
  ["components", "elements"],
] as const;

export async function readElementSource(file: string): Promise<string> {
  for (const root of SOURCE_ROOTS) {
    try {
      const source = await fs.readFile(
        path.join(process.cwd(), ...root, file),
        "utf8",
      );
      return source.trimEnd();
    } catch {
      continue;
    }
  }
  throw new Error(`Element source not found: ${file}`);
}

export async function highlightElementSource(code: string): Promise<string> {
  return codeToHtml(code, {
    lang: "tsx",
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: "light-dark()",
  });
}
