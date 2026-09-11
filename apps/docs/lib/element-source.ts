import { promises as fs } from "node:fs";
import path from "node:path";
import { codeToHtml } from "shiki";

const SOURCE_ROOTS = [
  [
    "..",
    "..",
    "packages",
    "ui",
    "src",
    "components",
    "react",
    "assistant-ui",
    "elements",
  ],
  ["components", "demo", "elements"],
] as const;

export async function readElementSource(file: string): Promise<string> {
  let cause: unknown;
  for (const root of SOURCE_ROOTS) {
    try {
      const source = await fs.readFile(
        path.join(process.cwd(), ...root, file),
        "utf8",
      );
      return source.trimEnd();
    } catch (error) {
      cause = error;
    }
  }
  throw new Error(`Element source not found: ${file}`, { cause });
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
