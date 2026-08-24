import { promises as fs } from "node:fs";
import path from "node:path";
import { codeToHtml } from "shiki";

const SOURCE_ROOT = [
  "..",
  "..",
  "packages",
  "ui",
  "src",
  "components",
  "elements",
] as const;

export async function readElementSource(file: string): Promise<string> {
  try {
    const source = await fs.readFile(
      path.join(process.cwd(), ...SOURCE_ROOT, file),
      "utf8",
    );
    return source.trimEnd();
  } catch (cause) {
    throw new Error(`Element source not found: ${file}`, { cause });
  }
}

export async function highlightElementSource(
  code: string,
  lang: "tsx" | "json" = "tsx",
): Promise<string> {
  return codeToHtml(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: "light-dark()",
  });
}
